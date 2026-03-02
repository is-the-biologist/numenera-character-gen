/**
 * Fix script: re-scrape descriptor pages from the SRD to correctly extract
 * trainedSkills and specialAbilities that the original scraper missed.
 *
 * Three parsing gaps fixed:
 * 1. Named traits that grant training (e.g. "Inelegant: You are trained in...")
 * 2. Named special abilities that were hardcoded in an exclusion list
 * 3. "Skill:" lines with preamble text before "trained in"
 *
 * Usage: npx tsx scripts/fix-descriptor-skills.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://numenera2e.wikidot.com';
const DATA_DIR = path.resolve(__dirname, '../src/data/descriptors');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchPage(urlPath: string): Promise<cheerio.CheerioAPI> {
  const url = `${BASE}${urlPath}`;
  console.log(`Fetching: ${url}`);
  const { data } = await axios.get(url, { timeout: 15000 });
  return cheerio.load(data);
}

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function titleCaseWords(s: string): string {
  return s.split(/[\s-]+/).map(w => titleCase(w)).join(' ');
}

// Standard section headers that are NOT special abilities
const SECTION_HEADERS = /^(Skills?|Inability|Initial Link|Additional Equipment|You (?:gain|have) the following)/i;

// Lines that are pool modifiers, not abilities
const POOL_MOD_RE = /^[+−-]\d+\s+to\s+your\s+(?:Might|Speed|Intellect)\s+Pool/i;

interface DescriptorPatch {
  trainedSkills: string[];
  specialAbilities: { name: string; description: string }[];
}

/**
 * Parse a single descriptor's text block for trained skills and special abilities.
 */
function parseDescriptorTraits(fullText: string): DescriptorPatch {
  const trainedSkills: string[] = [];
  const specialAbilities: { name: string; description: string }[] = [];

  // Split into lines for line-by-line analysis
  const lines = fullText.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const trimmed = line.trim();

    // --- Pass 1: "Skill:" / "Skills:" lines ---
    // Match "Skill: ... trained in ..." (preamble text allowed before "trained in")
    const skillPrefixMatch = trimmed.match(/^Skills?:\s*(.+)/i);
    if (skillPrefixMatch) {
      const afterPrefix = skillPrefixMatch[1];
      // Find "trained in" anywhere in the text
      const trainedMatch = afterPrefix.match(/(?:You(?:'re| are) )?trained in (.+?)\.?$/i);
      if (trainedMatch) {
        trainedSkills.push(trainedMatch[1].trim().toLowerCase());
      }
      continue;
    }

    // --- Pass 2: Named traits "Name: description" ---
    // Match lines like "Inelegant: You are trained in..." or "First Strike: The first time..."
    const namedTraitMatch = trimmed.match(/^([A-Z][A-Za-z\s'''-]+?)(?:\s*\(\d+\s*(?:Might|Speed|Intellect)\s*points?\))?\s*:\s*(.+)$/);
    if (!namedTraitMatch) continue;

    const traitName = namedTraitMatch[1].trim();
    const traitDesc = namedTraitMatch[2].trim();

    // Skip standard section headers
    if (SECTION_HEADERS.test(traitName)) continue;

    // Skip pool modifier lines (e.g. "Mighty: +4 to your Might Pool")
    if (POOL_MOD_RE.test(traitDesc)) continue;

    // Check if this named trait grants training
    const namedTrainedMatch = traitDesc.match(/You(?:'re| are) trained in (.+?)\.(?:\s|$)/i);
    if (namedTrainedMatch) {
      trainedSkills.push(namedTrainedMatch[1].trim().toLowerCase());
    }

    // If the description is meaningful (>10 chars) and not just a pool mod,
    // capture it as a special ability
    if (traitDesc.length > 10 && !POOL_MOD_RE.test(traitDesc)) {
      specialAbilities.push({ name: traitName, description: traitDesc });
    }
  }

  return { trainedSkills, specialAbilities };
}

interface DescriptorRaw {
  id: string;
  name: string;
  source: string;
  description: string;
  poolModifiers: Record<string, number>;
  edgeModifiers?: Record<string, number>;
  trainedSkills: string[];
  inabilities: string[];
  specialAbilities: { name: string; description: string }[];
  additionalEquipment: string[];
  initialLinks: string[];
}

/**
 * Scrape a descriptor page and return a map of descriptor name -> patch data
 */
function scrapePatches($: cheerio.CheerioAPI): Map<string, DescriptorPatch> {
  const content = $('#page-content');
  const patches = new Map<string, DescriptorPatch>();

  content.find('h3').each((_, heading) => {
    const rawName = $(heading).find('span').text().trim() || $(heading).text().trim();
    if (!rawName || /overview|general|location|racial|destiny/i.test(rawName)) return;

    const name = titleCaseWords(rawName.replace(/\*+$/, '').trim());

    // Collect all text until next h3 or h1
    let fullText = '';
    let el = $(heading).next();
    while (el.length && !el.is('h3,h1,hr')) {
      fullText += el.text() + '\n';
      el = el.next();
    }

    const patch = parseDescriptorTraits(fullText);
    patches.set(name, patch);
  });

  return patches;
}

/**
 * Merge patches into existing JSON array, updating only trainedSkills and specialAbilities
 */
function mergePatches(descriptors: DescriptorRaw[], patches: Map<string, DescriptorPatch>): { updated: string[]; unchanged: string[] } {
  const updated: string[] = [];
  const unchanged: string[] = [];

  for (const desc of descriptors) {
    const patch = patches.get(desc.name);
    if (!patch) {
      unchanged.push(desc.name);
      continue;
    }

    const oldSkills = JSON.stringify(desc.trainedSkills);
    const oldAbilities = JSON.stringify(desc.specialAbilities);

    // Replace trainedSkills and specialAbilities with freshly parsed data
    desc.trainedSkills = patch.trainedSkills;
    desc.specialAbilities = patch.specialAbilities;

    if (oldSkills !== JSON.stringify(desc.trainedSkills) || oldAbilities !== JSON.stringify(desc.specialAbilities)) {
      updated.push(desc.name);
    } else {
      unchanged.push(desc.name);
    }
  }

  return { updated, unchanged };
}

async function main() {
  console.log('=== Fix Descriptor Skills & Special Abilities ===\n');

  const pages: [string, string][] = [
    ['/descriptors', 'discovery.json'],
    ['/destiny-descriptors', 'destiny.json'],
    ['/location-descriptors', 'location-based.json'],
    ['/racial-options', 'racial.json'],
  ];

  for (const [urlPath, filename] of pages) {
    const filepath = path.join(DATA_DIR, filename);

    // Read existing JSON
    let descriptors: DescriptorRaw[];
    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      descriptors = JSON.parse(raw || '[]');
    } catch {
      console.log(`  Skipping ${filename} (empty or missing)`);
      continue;
    }

    if (descriptors.length === 0) {
      console.log(`  Skipping ${filename} (no descriptors)`);
      continue;
    }

    // Fetch and parse patches from SRD
    try {
      const $ = await fetchPage(urlPath);
      const patches = scrapePatches($);
      console.log(`  Found ${patches.size} descriptors on page`);

      const { updated, unchanged } = mergePatches(descriptors, patches);

      // Write back
      fs.writeFileSync(filepath, JSON.stringify(descriptors, null, 2) + '\n');

      console.log(`  ${filename}: ${updated.length} updated, ${unchanged.length} unchanged`);
      if (updated.length > 0) {
        console.log(`    Updated: ${updated.join(', ')}`);
      }
    } catch (e: any) {
      console.error(`  Failed to process ${urlPath}: ${e.message}`);
    }

    await sleep(500);
  }

  // Spot-check
  console.log('\n=== Spot-check ===');
  const discoveryPath = path.join(DATA_DIR, 'discovery.json');
  const discovery: DescriptorRaw[] = JSON.parse(fs.readFileSync(discoveryPath, 'utf-8'));

  const checks = ['Clumsy', 'Tough', 'Charming', 'Aggressive', 'Foolish', 'Hardy'];
  for (const name of checks) {
    const d = discovery.find(d => d.name === name);
    if (!d) {
      console.log(`  ${name}: NOT FOUND`);
      continue;
    }
    console.log(`  ${name}:`);
    console.log(`    trainedSkills: ${JSON.stringify(d.trainedSkills)}`);
    console.log(`    specialAbilities: ${d.specialAbilities.map(a => a.name).join(', ') || '(none)'}`);
  }

  console.log('\n=== Done ===');
}

main().catch(e => {
  console.error('Fix script failed:', e);
  process.exit(1);
});
