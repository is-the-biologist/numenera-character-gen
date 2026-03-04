/**
 * Focused foci scraper that properly extracts tier abilities.
 * Replaces the foci portion of scrape-srd.ts with correct parsing.
 *
 * Usage: npx tsx scripts/scrape-foci.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const BASE = 'http://numenera2e.wikidot.com';

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseAbilityCost(text: string): { pool: 'might' | 'speed' | 'intellect'; amount: number } | undefined {
  const m = text.match(/(\d+)\+?\s*(Might|Speed|Intellect)\s*points?/i);
  if (m) {
    return {
      amount: parseInt(m[1], 10),
      pool: m[2].toLowerCase() as 'might' | 'speed' | 'intellect',
    };
  }
  return undefined;
}

function parseAbilityType(text: string): 'action' | 'enabler' {
  if (/\benabler\b/i.test(text)) return 'enabler';
  return 'action';
}

interface AbilityRaw {
  id: string;
  name: string;
  description: string;
  cost?: { pool: 'might' | 'speed' | 'intellect'; amount: number };
  type: 'action' | 'enabler';
  tier: number;
  source: string;
}

interface FocusRaw {
  id: string;
  name: string;
  description: string;
  connection: string;
  connections: string[];
  tier1: {
    grantedAbilities: AbilityRaw[];
    abilityChoice?: { pickCount: number; options: AbilityRaw[] };
    trainedSkills: string[];
    additionalEquipment: string[];
  };
  higherTiers: { tier: number; abilities: AbilityRaw[] }[];
}

function parseTierAbilities(text: string, tierNum: number, focusId: string): AbilityRaw[] {
  const abilities: AbilityRaw[] = [];

  // Match patterns like:
  // "Ability Name (X Pool points)." or "Ability Name (X+ Pool points)." followed by description
  // Also match abilities without cost like "Ability Name." followed by description
  const abilityPattern = /([A-Z][A-Za-z\s''\u2019-]+?)\s*(?:\(([^)]+)\))?\s*\.\s*(.+?)(?=\n[A-Z][A-Za-z\s''\u2019-]+?\s*(?:\([^)]+\))?\s*\.|$)/gs;

  for (const m of text.matchAll(abilityPattern)) {
    const name = m[1].trim();
    const costStr = m[2] || '';
    const desc = m[3].trim();

    // Skip non-ability entries
    if (/^(Ability Choice|Choose either|GM Intrusion|Minor Effect|Major Effect)/i.test(name)) continue;
    if (desc.length < 15) continue;

    const cost = parseAbilityCost(costStr);
    abilities.push({
      id: toKebab(name),
      name,
      description: desc,
      ...(cost ? { cost } : {}),
      type: parseAbilityType(desc),
      tier: tierNum,
      source: focusId,
    });
  }

  return abilities;
}

async function scrapeFoci(): Promise<FocusRaw[]> {
  console.log(`Fetching: ${BASE}/foci`);
  const { data } = await axios.get(`${BASE}/foci`, { timeout: 15000 });
  const $ = cheerio.load(data);
  const content = $('#page-content');

  const foci: FocusRaw[] = [];

  // Each focus is under an h3 heading
  const h3s = content.find('h3');
  const h3Array: cheerio.Element[] = [];
  h3s.each((_, el) => h3Array.push(el));

  for (let i = 0; i < h3Array.length; i++) {
    const heading = $(h3Array[i]);
    const rawName = heading.find('span').text().trim() || heading.text().trim();
    if (!rawName || /overview|general|origin/i.test(rawName)) continue;

    // Collect all text between this h3 and the next h3
    let fullText = '';
    let el = heading.next();
    while (el.length && !el.is('h3,h1')) {
      if (el.is('p,div,ul,ol,table')) {
        fullText += el.text() + '\n';
      }
      el = el.next();
    }

    const name = rawName.replace(/\*+$/, '').trim();
    // Title case: "BEARS A HALO OF FIRE" -> "Bears a Halo of Fire"
    const titleName = name.replace(/\w\S*/g, (w, idx) => {
      const lower = w.toLowerCase();
      // Keep small words lowercase unless first word
      if (idx > 0 && ['a', 'an', 'the', 'of', 'at', 'in', 'on', 'to', 'with', 'and', 'or', 'but', 'for'].includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });
    const id = toKebab(name);

    // Description: first paragraph before Connection/Tier/Equipment
    const descMatch = fullText.match(/^(.+?)(?=Connection:|Tier \d|Additional Equipment:|Minor Effect|Major Effect|\*\*)/is);
    const description = descMatch ? descMatch[1].trim() : fullText.split('\n')[0].trim();

    // Connections
    const connections: string[] = [];
    const connMatches = fullText.matchAll(/\d+\.\s*(Pick one other PC\..+?)(?=\n\d+\.|\n[A-Z]|\n\*|$)/gs);
    for (const cm of connMatches) {
      connections.push(cm[1].trim());
    }
    const connection = connections[0] || '';

    // Trained skills — extracted from tier 1 block only, after tier blocks are parsed
    // (populated below after tier extraction)
    let trainedSkills: string[] = [];

    // Additional equipment
    const additionalEquipment: string[] = [];
    const equipMatch = fullText.match(/Additional Equipment:\s*(.+?)(?=\n(?:Tier|Minor|Major|\*\*|Connection|$))/is);
    if (equipMatch) {
      const equipText = equipMatch[1].trim();
      if (equipText.length > 2) {
        additionalEquipment.push(equipText);
      }
    }

    // Parse tier abilities
    // Extract each tier's text block
    const tierBlocks: { tier: number; text: string }[] = [];
    const tierPattern = /Tier (\d):\s*(.+?)(?=Tier \d:|$)/gs;
    for (const tm of fullText.matchAll(tierPattern)) {
      tierBlocks.push({
        tier: parseInt(tm[1], 10),
        text: tm[2].trim(),
      });
    }

    // Parse tier 1
    const tier1Block = tierBlocks.find(b => b.tier === 1);
    const tier1Abilities: AbilityRaw[] = [];

    if (tier1Block) {
      // Parse the tier 1 text for abilities
      // Format: "Ability Name (cost). Description. Action/Enabler."
      const t1Text = tier1Block.text;

      // Split on ability boundaries
      // First ability starts right after "Tier 1: "
      const abilityChunks = t1Text.split(/(?=\n[A-Z][A-Za-z\s''\u2019-]+?\s*(?:\([^)]+\))?\s*\.)/);

      for (const chunk of abilityChunks) {
        const am = chunk.trim().match(/^([A-Z][A-Za-z\s''\u2019-]+?)\s*(?:\(([^)]+)\))?\.\s*(.+)/s);
        if (!am) continue;
        const aName = am[1].trim();
        const costStr = am[2] || '';
        const desc = am[3].trim();

        if (/^(Ability Choice|Choose either|GM Intrusion)/i.test(aName)) continue;
        if (desc.length < 15) continue;

        const cost = parseAbilityCost(costStr);
        tier1Abilities.push({
          id: toKebab(aName),
          name: aName,
          description: desc,
          ...(cost ? { cost } : {}),
          type: parseAbilityType(desc),
          tier: 1,
          source: id,
        });
      }
    }

    // Extract trained skills from tier 1 text only
    if (tier1Block) {
      const skillMatches = tier1Block.text.matchAll(/trained in (.+?)(?:\.|$)/gi);
      for (const sm of skillMatches) {
        const skillText = sm[1].trim().toLowerCase();
        // Split comma-separated skill lists like "searching, listening, climbing, balancing, and jumping"
        const parts = skillText
          .replace(/\s+and\s+/g, ', ')
          .split(/,\s*/)
          .map(s => s.replace(/\s*tasks?\s*$/i, '').trim())
          .filter(s => s.length > 1 && s.length < 80);
        if (parts.length > 1) {
          trainedSkills.push(...parts);
        } else if (skillText.length > 2 && skillText.length < 80) {
          trainedSkills.push(skillText.replace(/\s*tasks?\s*$/i, ''));
        }
      }
    }

    // Parse higher tiers (2-6)
    const higherTiers: { tier: number; abilities: AbilityRaw[] }[] = [];
    for (const block of tierBlocks) {
      if (block.tier <= 1) continue;

      const abilities: AbilityRaw[] = [];
      const t = block.text;

      // Check for ability choice tier
      const isChoice = /^Ability Choice/i.test(t);

      // Split abilities in this tier
      const chunks = t.split(/(?=\n[A-Z][A-Za-z\s''\u2019-]+?\s*(?:\([^)]+\))?\s*\.)/);

      for (const chunk of chunks) {
        const am = chunk.trim().match(/^(?:Ability Choice\.\s*Choose (?:either|one of) .+?\.\s*)?([A-Z][A-Za-z\s''\u2019-]+?)\s*(?:\(([^)]+)\))?\.\s*(.+)/s);
        if (!am) continue;
        const aName = am[1].trim();
        const costStr = am[2] || '';
        let desc = am[3].trim();

        if (/^(Ability Choice|Choose either|Choose one|GM Intrusion|Minor Effect|Major Effect)/i.test(aName)) continue;
        if (desc.length < 15) continue;

        // Clean up desc - remove trailing ability that leaked in
        const nextAbilityIdx = desc.search(/\n[A-Z][A-Za-z\s''\u2019-]+?\s*(?:\([^)]+\))?\./);
        if (nextAbilityIdx > 0) {
          desc = desc.substring(0, nextAbilityIdx).trim();
        }

        const cost = parseAbilityCost(costStr);
        abilities.push({
          id: toKebab(aName),
          name: aName,
          description: desc,
          ...(cost ? { cost } : {}),
          type: parseAbilityType(desc),
          tier: block.tier,
          source: id,
        });
      }

      if (abilities.length > 0) {
        higherTiers.push({ tier: block.tier, abilities });
      }
    }

    // Detect tier 1 ability choice (some foci have "choose one" at tier 1)
    let abilityChoice: { pickCount: number; options: AbilityRaw[] } | undefined;

    foci.push({
      id,
      name: titleName,
      description,
      connection,
      connections,
      tier1: {
        grantedAbilities: tier1Abilities,
        ...(abilityChoice ? { abilityChoice } : {}),
        trainedSkills,
        additionalEquipment,
      },
      higherTiers,
    });

    console.log(`  ${titleName}: ${tier1Abilities.length} T1 abilities, ${higherTiers.length} higher tiers`);
  }

  return foci;
}

async function main() {
  console.log('=== Numenera 2E Foci Scraper ===\n');

  const foci = await scrapeFoci();

  const outPath = path.join(DATA_DIR, 'foci.json');
  fs.writeFileSync(outPath, JSON.stringify(foci, null, 2));
  console.log(`\nWrote ${foci.length} foci to ${outPath}`);
}

main().catch(e => {
  console.error('Scraper failed:', e);
  process.exit(1);
});
