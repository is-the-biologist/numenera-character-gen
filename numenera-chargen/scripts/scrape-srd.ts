/**
 * One-time SRD data extraction script.
 * Fetches Numenera 2E SRD pages from numenera2e.wikidot.com
 * and produces typed JSON data files for src/data/.
 *
 * Usage: npx tsx scripts/scrape-srd.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://numenera2e.wikidot.com';
const DATA_DIR = path.resolve(__dirname, '../src/data');

// Rate-limit helper
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchPage(urlPath: string): Promise<cheerio.CheerioAPI> {
  const url = `${BASE}${urlPath}`;
  console.log(`Fetching: ${url}`);
  const { data } = await axios.get(url, { timeout: 15000 });
  return cheerio.load(data);
}

// ─── TYPE SCRAPER ───

interface AbilityRaw {
  id: string;
  name: string;
  description: string;
  cost?: { pool: 'might' | 'speed' | 'intellect'; amount: number };
  type: 'action' | 'enabler';
  tier: number;
  source: string;
}

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseAbilityCost(text: string): { pool: 'might' | 'speed' | 'intellect'; amount: number } | undefined {
  const m = text.match(/\((\d+)\+?\s*(Might|Speed|Intellect)\s*points?\)/i);
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

function parseAbilitiesFromList(items: string[], tier: number, source: string): AbilityRaw[] {
  const abilities: AbilityRaw[] = [];
  for (const item of items) {
    // Format: **Name (cost):** Description
    const m = item.match(/^\*?\*?([^:(*]+?)(?:\s*\(([^)]+)\))?\s*:\*?\*?\s*(.+)$/s);
    if (!m) continue;
    const name = m[1].trim();
    const costStr = m[2] || '';
    const desc = m[3].trim();
    const cost = parseAbilityCost(`(${costStr})`);
    abilities.push({
      id: toKebab(name),
      name,
      description: desc,
      ...(cost ? { cost } : {}),
      type: parseAbilityType(desc),
      tier,
      source,
    });
  }
  return abilities;
}

async function scrapeType(urlPath: string): Promise<any> {
  const $ = await fetchPage(urlPath);
  const content = $('#page-content');
  const typeName = urlPath.replace('/', '');
  const typeId = typeName.toLowerCase();

  // Get overview paragraph
  const overviewH1 = content.find('h1#toc0');
  let description = '';
  let el = overviewH1.next();
  while (el.length && !el.is('h1,h2,h3,h4,hr,div.col-sm-5,div.col-sm-4')) {
    if (el.is('p')) description += el.text() + ' ';
    el = el.next();
  }
  description = description.trim();

  // Parse stat pools from table
  const statTable = content.find('h2#toc1').parent().find('table.wiki-content-table');
  const pools = { might: 0, speed: 0, intellect: 0 };
  statTable.find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const stat = cells.first().text().trim().toLowerCase();
      const val = parseInt(cells.last().text().trim(), 10);
      if (stat in pools) (pools as any)[stat] = val;
    }
  });

  // Parse bonus pool points from text near stat table
  let bonusPoolPoints = 6; // default
  const bonusText = content.find('h2#toc1').parent().find('p').text();
  const bonusMatch = bonusText.match(/(\d+)\s+additional\s+points/i);
  if (bonusMatch) bonusPoolPoints = parseInt(bonusMatch[1], 10);

  // Parse First-Tier section for abilities and details
  const firstTierHeading = content.find('h4#toc7');
  let firstTierText = '';
  let firstTierEl = firstTierHeading.next();
  const fightingMoveItems: string[] = [];
  let inFightingMoves = false;

  // Collect all text until next h4
  while (firstTierEl.length && !firstTierEl.is('h4')) {
    if (firstTierEl.is('p')) {
      const pText = firstTierEl.text();
      firstTierText += pText + '\n';
      if (/fighting moves|esoteries|tricks of the trade|precepts|delve lore|wright abilities/i.test(pText)) {
        inFightingMoves = true;
      }
    }
    if (firstTierEl.is('ul') && inFightingMoves) {
      firstTierEl.find('li').each((_, li) => {
        fightingMoveItems.push($(li).text().trim());
      });
      inFightingMoves = false;
    }
    firstTierEl = firstTierEl.next();
  }

  // Parse edge from "Fighter:" or similar line
  const edge = { might: 0, speed: 0, intellect: 0 };
  const edgeMatch = firstTierText.match(/Might Edge of (\d+),?\s*(?:a )?Speed Edge of (\d+),?\s*(?:and )?(?:an )?Intellect Edge of (\d+)/i);
  if (edgeMatch) {
    edge.might = parseInt(edgeMatch[1], 10);
    edge.speed = parseInt(edgeMatch[2], 10);
    edge.intellect = parseInt(edgeMatch[3], 10);
  }

  // Parse effort
  let effort = 1;
  const effortMatch = firstTierText.match(/Effort is (\d+)/i);
  if (effortMatch) effort = parseInt(effortMatch[1], 10);

  // Parse cypher limit
  let cypherLimit = 2;
  const cypherMatch = firstTierText.match(/bear (\w+) cyphers/i);
  if (cypherMatch) {
    const numWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    cypherLimit = numWords[cypherMatch[1].toLowerCase()] || parseInt(cypherMatch[1], 10) || 2;
  }

  // Parse weapons proficiency
  let weaponProficiency: 'all' | 'light-and-medium' | 'light-only' = 'light-only';
  if (/can use any weapon|practiced with all weapons/i.test(firstTierText)) {
    weaponProficiency = 'all';
  } else if (/light and medium/i.test(firstTierText)) {
    weaponProficiency = 'light-and-medium';
  }

  // Armor training
  const trainedInArmor = /trained in armor/i.test(firstTierText);

  // Practice with all weapons
  const practiceWithAllWeapons = weaponProficiency === 'all';

  // Parse physical skills choice
  const skillChoices: any[] = [];
  const physSkillMatch = firstTierText.match(/Choose one of the following skills.*?:\s*([\w\s,]+(?:, or [\w\s]+)?)\./i);
  if (physSkillMatch) {
    const skillOptions = physSkillMatch[1]
      .replace(/ or /g, ', ')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
    skillChoices.push({
      label: 'Physical Skill',
      pickCount: 1,
      options: skillOptions,
      freeform: false,
    });
  }

  // For Jack, detect freeform skills
  const freeformSkillMatch = firstTierText.match(/trained in (?:one|two|three) (?:skills?|tasks?) of your choice/i);
  if (freeformSkillMatch) {
    const countWord = firstTierText.match(/(one|two|three) (?:skills?|tasks?) of your choice/i);
    const countMap: Record<string, number> = { one: 1, two: 2, three: 3 };
    const count = countMap[(countWord?.[1] || 'one').toLowerCase()] || 1;
    for (let i = 0; i < count; i++) {
      skillChoices.push({
        label: 'Trained Skill',
        pickCount: 1,
        options: [],
        freeform: true,
      });
    }
  }

  // For Nano, detect numenera skill choice
  const numSkillMatch = firstTierText.match(/trained in (?:one of the following|either).*?(understanding numenera|salvaging numenera|crafting numenera)/i);
  if (!numSkillMatch && /numenera/i.test(typeId)) {
    // Check for Nano-specific skill
    if (/choose one of the following skills in which you aren't already trained/i.test(firstTierText)) {
      // Already handled by physSkillMatch
    }
  }

  // Parse inabilities
  const inabilities: string[] = [];
  const inabilityMatch = firstTierText.match(/inability in ([\w\s,]+(?:,? and [\w\s]+)?)\./i);
  if (inabilityMatch) {
    const inabilityStr = inabilityMatch[1]
      .replace(/ and /g, ', ')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
    inabilities.push(...inabilityStr);
  }

  // Parse automatic skills
  const automaticSkills: string[] = [];

  // Parse shins from starting equipment
  let shins = 0;
  const shinsMatch = firstTierText.match(/(\d+)\s+shins/i);
  if (shinsMatch) shins = parseInt(shinsMatch[1], 10);

  // Parse starting equipment
  const startingEquipment: string[] = [];
  const equipMatch = firstTierText.match(/start with (.+?)(?:\.|Before selecting)/is);
  if (equipMatch) {
    const rawEquip = equipMatch[1]
      .split(',')
      .map(s => s.trim())
      .map(s => s.replace(/^and /, ''))
      .filter(s => s.length > 0 && !/shin/i.test(s));
    startingEquipment.push(...rawEquip);
  }

  // Parse fighting moves / esoteries / tricks
  let abilityLabel = 'Abilities';
  if (/fighting moves/i.test(firstTierText)) abilityLabel = 'Fighting Moves';
  else if (/esoteries/i.test(firstTierText)) abilityLabel = 'Esoteries';
  else if (/tricks of the trade/i.test(firstTierText)) abilityLabel = 'Tricks of the Trade';
  else if (/precepts/i.test(firstTierText)) abilityLabel = 'Precepts';
  else if (/delve lore/i.test(firstTierText)) abilityLabel = 'Delve Lore';
  else if (/wright abilities/i.test(firstTierText)) abilityLabel = 'Wright Abilities';

  const fightingMoves = parseAbilitiesFromList(fightingMoveItems, 1, typeId);

  // Parse special abilities (automatic ones from first tier text)
  const specialAbilities: AbilityRaw[] = [];
  if (/combat prowess/i.test(firstTierText)) {
    specialAbilities.push({
      id: 'combat-prowess',
      name: 'Combat Prowess',
      description: 'You add +1 damage to one type of attack of your choice: melee attacks or ranged attacks. Enabler.',
      type: 'enabler',
      tier: 1,
      source: typeId,
    });
  }
  if (trainedInArmor) {
    specialAbilities.push({
      id: 'trained-in-armor',
      name: 'Trained in Armor',
      description: 'You can wear armor for long periods of time without tiring and can compensate for slowed reactions from wearing armor. You reduce the Speed Effort cost for wearing armor by 1. Enabler.',
      type: 'enabler',
      tier: 1,
      source: typeId,
    });
  }
  if (practiceWithAllWeapons) {
    specialAbilities.push({
      id: 'practiced-with-all-weapons',
      name: 'Practiced With All Weapons',
      description: 'You can use any weapon without penalty. Enabler.',
      type: 'enabler',
      tier: 1,
      source: typeId,
    });
  } else if (weaponProficiency === 'light-and-medium') {
    specialAbilities.push({
      id: `practiced-with-light-and-medium-weapons-${typeId}`,
      name: 'Practiced With Light and Medium Weapons',
      description: 'You can use light and medium weapons without penalty. Enabler.',
      type: 'enabler',
      tier: 1,
      source: typeId,
    });
  } else if (weaponProficiency === 'light-only') {
    specialAbilities.push({
      id: `practiced-with-light-weapons-${typeId}`,
      name: 'Practiced With Light Weapons',
      description: 'You can use light weapons without penalty. Enabler.',
      type: 'enabler',
      tier: 1,
      source: typeId,
    });
  }

  // Parse backgrounds
  const backgrounds: { name: string; description: string }[] = [];
  const bgSection = content.find('h1#toc13');
  if (bgSection.length) {
    bgSection.nextAll('div.feature').first().find('table.wiki-content-table').each((_, table) => {
      const name = $(table).find('th').text().trim();
      const desc = $(table).find('td').text().trim();
      if (name && desc) {
        backgrounds.push({ name: titleCase(name), description: desc });
      }
    });
  }

  // Flex edge for Jack
  const flexEdge = /jack/i.test(typeId) ? 1 : undefined;

  const result: any = {
    id: typeId,
    name: titleCase(typeId),
    description,
    basePools: pools,
    bonusPoolPoints,
    baseEdge: edge,
    ...(flexEdge !== undefined ? { flexEdge } : {}),
    effort,
    cypherLimit,
    weaponProficiency,
    trainedInArmor,
    practiceWithAllWeapons,
    startingEquipment,
    shins,
    backgrounds,
    abilityChoices: [{
      label: abilityLabel,
      pickCount: 2,
      options: fightingMoves,
    }],
    skillChoices,
    automaticSkills,
    inabilities,
    specialAbilities,
  };

  return result;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── DESCRIPTOR SCRAPER ───

interface DescriptorRaw {
  id: string;
  name: string;
  source: 'discovery' | 'destiny' | 'location' | 'racial';
  description: string;
  poolModifiers: { might?: number; speed?: number; intellect?: number };
  edgeModifiers?: { might?: number; speed?: number; intellect?: number };
  trainedSkills: string[];
  inabilities: string[];
  specialAbilities: { name: string; description: string; cost?: { pool: 'might' | 'speed' | 'intellect'; amount: number } }[];
  additionalEquipment: string[];
  initialLinks: string[];
}

function parsePoolModifiers(text: string): { might?: number; speed?: number; intellect?: number } {
  const mods: { might?: number; speed?: number; intellect?: number } = {};
  // Match patterns like "+2 to your Might Pool" or "−2 to your Speed Pool"
  const matches = text.matchAll(/([+−-])(\d+)\s+to\s+your\s+(Might|Speed|Intellect)\s+Pool/gi);
  for (const m of matches) {
    const sign = m[1] === '+' ? 1 : -1;
    const val = sign * parseInt(m[2], 10);
    const stat = m[3].toLowerCase() as 'might' | 'speed' | 'intellect';
    mods[stat] = (mods[stat] || 0) + val;
  }
  return mods;
}

function scrapeDescriptorsFromPage($: cheerio.CheerioAPI, source: 'discovery' | 'destiny' | 'location' | 'racial'): DescriptorRaw[] {
  const content = $('#page-content');
  const descriptors: DescriptorRaw[] = [];

  // Each descriptor is under an h3 heading
  content.find('h3').each((_, heading) => {
    const rawName = $(heading).find('span').text().trim() || $(heading).text().trim();
    if (!rawName || /overview|general|location|racial|destiny/i.test(rawName)) return;

    // Remove asterisks from name
    const name = rawName.replace(/\*+$/, '').trim();
    const id = toKebab(name);

    // Collect all text until next h3 or h1
    let fullText = '';
    let el = $(heading).next();
    while (el.length && !el.is('h3,h1,hr')) {
      fullText += el.text() + '\n';
      el = el.next();
    }

    // Extract description (first paragraph / character description)
    const descMatch = fullText.match(/^(.+?)(?:You (?:gain|have) the following|You gain the following)/is);
    const description = descMatch ? descMatch[1].trim() : fullText.split('\n')[0].trim();

    // Pool modifiers
    const poolModifiers = parsePoolModifiers(fullText);

    // Trained skills
    const trainedSkills: string[] = [];
    const skillMatches = fullText.matchAll(/Skill:\s*You(?:'re| are) trained in (.+?)(?:\.|$)/gim);
    for (const sm of skillMatches) {
      const skillText = sm[1].trim().toLowerCase();
      trainedSkills.push(skillText);
    }

    // Inabilities
    const inabilities: string[] = [];
    const inabilityMatches = fullText.matchAll(/Inability:\s*(.+?)(?:\n|$)/gi);
    for (const im of inabilityMatches) {
      const text = im[1].trim();
      // Extract the specific inability
      const taskMatch = text.match(/(?:difficulty of )?(?:any )?(?:tasks? involving|task (?:involving|related to)) (.+?) (?:is|are) (?:increased|hindered)/i);
      if (taskMatch) {
        inabilities.push(taskMatch[1].trim().toLowerCase());
      } else {
        // Try simpler pattern
        const simpleMatch = text.match(/hindered (?:in|when|at) (.+)/i);
        if (simpleMatch) inabilities.push(simpleMatch[1].trim().toLowerCase());
        else inabilities.push(text.toLowerCase());
      }
    }

    // Special abilities (non-standard entries)
    const specialAbilities: { name: string; description: string; cost?: { pool: 'might' | 'speed' | 'intellect'; amount: number } }[] = [];
    // Look for named abilities like "Disarm With Humor (3 Intellect points):" or "Expert Helper:" etc
    const abilityMatches = fullText.matchAll(/(?:^|\n)([A-Z][A-Za-z\s]+?)(\s*\(\d+\s*(?:Might|Speed|Intellect)\s*points?\))?\s*:\s*(.+?)(?=\n[A-Z]|\nSkill:|\nInability:|\nAdditional Equipment:|\nInitial Link|\n\d+\.)/gis);
    for (const am of abilityMatches) {
      const abilityName = am[1].trim();
      const costText = am[2] || '';
      const abilityDesc = am[3].trim();
      // Skip standard fields
      if (/^(Skill|Inability|Initial Link|Additional Equipment|Personable|Smart|Witty|Hostile|Rash|Furtive|Capable|Butterfingers|Thick-Muscled|Inelegant|Harsh|Dumb Luck)/i.test(abilityName)) continue;
      if (/^\+?\d+ to your/i.test(abilityDesc)) continue; // Pool modifier, not ability
      // Only include actual abilities
      if (abilityDesc.length > 20) {
        const cost = parseAbilityCost(costText);
        specialAbilities.push({ name: abilityName, description: abilityDesc, ...(cost ? { cost } : {}) });
      }
    }

    // Additional equipment
    const additionalEquipment: string[] = [];
    const equipMatch = fullText.match(/Additional Equipment:\s*(.+?)(?:\n|Initial Link)/is);
    if (equipMatch) {
      const equipText = equipMatch[1].trim();
      // Check for shins
      const shinsMatch = equipText.match(/(\d+)\s+extra\s+shins/i);
      if (shinsMatch) additionalEquipment.push(`${shinsMatch[1]} extra shins`);
      // Other equipment
      const otherEquip = equipText.replace(/\d+\s+extra\s+shins[^.]*\.?/i, '').trim();
      if (otherEquip) {
        additionalEquipment.push(...otherEquip.split(/[,.]/).map(s => s.trim()).filter(s => s.length > 2));
      }
    }

    // Initial links
    const initialLinks: string[] = [];
    const linksMatch = fullText.match(/Initial Link.*?:\s*(?:From the following.*?\n)?(.+?)$/is);
    if (linksMatch) {
      const linksText = linksMatch[1];
      const numbered = linksText.matchAll(/\d+\.\s*(.+?)(?=\n\d+\.|\n*$)/gs);
      for (const nm of numbered) {
        const link = nm[1].trim();
        if (link.length > 5) initialLinks.push(link);
      }
    }

    if (name) {
      descriptors.push({
        id,
        name,
        source,
        description,
        poolModifiers,
        trainedSkills,
        inabilities,
        specialAbilities,
        additionalEquipment,
        initialLinks,
      });
    }
  });

  return descriptors;
}

// ─── FOCUS SCRAPER ───

async function scrapeFociList(): Promise<string[]> {
  const $ = await fetchPage('/foci');
  const content = $('#page-content');
  const links: string[] = [];
  content.find('a').each((_, a) => {
    const href = $(a).attr('href');
    if (href && href.startsWith('/foci:') && !links.includes(href)) {
      links.push(href);
    }
  });
  // Also try simple links under h3 tags
  content.find('h3 a, h2 a, li a').each((_, a) => {
    const href = $(a).attr('href');
    if (href && (href.startsWith('/foci:') || href.startsWith('/foci/')) && !links.includes(href)) {
      links.push(href);
    }
  });
  return links;
}

async function scrapeFocus(urlPath: string): Promise<any | null> {
  try {
    const $ = await fetchPage(urlPath);
    const content = $('#page-content');
    const fullText = content.text();

    // Get name from page title or first h1
    const pageTitle = $('title').text().replace(/ - Numenera SRD$/, '').trim();
    const name = pageTitle || content.find('h1').first().text().trim();
    const id = toKebab(name);

    // Get description (first paragraph after overview heading or first p)
    let description = '';
    const firstP = content.find('p').first();
    if (firstP.length) description = firstP.text().trim();

    // Connection
    let connection = '';
    const connMatch = fullText.match(/(?:Connection|Pick one other PC)[.:]\s*(.+?)(?:\n|$)/i);
    if (connMatch) connection = connMatch[1].trim();

    // Tier 1 abilities
    const tier1Abilities: AbilityRaw[] = [];
    const tier1Skills: string[] = [];
    const tier1Equipment: string[] = [];

    // Find Tier 1 section
    const tier1Match = fullText.match(/(?:Tier 1|First.Tier)[:\s]*(.+?)(?=(?:Tier 2|Second.Tier|$))/is);
    if (tier1Match) {
      const t1Text = tier1Match[1];

      // Parse abilities from the tier 1 section
      const abilityItems: string[] = [];
      content.find('ul').each((_, ul) => {
        const ulText = $(ul).prev().text();
        if (/tier 1|first.tier/i.test(ulText)) {
          $(ul).find('li').each((_, li) => {
            abilityItems.push($(li).text().trim());
          });
        }
      });

      // Also look for bold ability names
      const boldAbilities = t1Text.matchAll(/([A-Z][A-Za-z\s]+?)(?:\s*\((\d+\s*(?:Might|Speed|Intellect)\s*points?)\))?\s*:\s*(.+?)(?=\n[A-Z]|\n\n|$)/gs);
      for (const ba of boldAbilities) {
        const abilityName = ba[1].trim();
        const costStr = ba[2] || '';
        const desc = ba[3].trim();
        if (/^(Tier|Connection|Equipment|GM Intrusion)/i.test(abilityName)) continue;
        const cost = costStr ? parseAbilityCost(`(${costStr})`) : undefined;
        tier1Abilities.push({
          id: toKebab(abilityName),
          name: abilityName,
          description: desc,
          ...(cost ? { cost } : {}),
          type: parseAbilityType(desc),
          tier: 1,
          source: id,
        });
      }

      // Skills
      const skillMatch = t1Text.match(/trained in (.+?)(?:\.|$)/gi);
      if (skillMatch) {
        for (const sm of skillMatch) {
          const skills = sm.replace(/^trained in /i, '').replace(/\.$/, '')
            .split(/,| and /)
            .map(s => s.trim().toLowerCase())
            .filter(s => s.length > 0);
          tier1Skills.push(...skills);
        }
      }

      // Equipment
      const equipMatch = t1Text.match(/(?:equipment|you also get|additional equipment)[.:]\s*(.+?)(?:\n|$)/i);
      if (equipMatch) {
        tier1Equipment.push(...equipMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0));
      }
    }

    // Higher tiers (simplified)
    const higherTiers: { tier: number; abilities: AbilityRaw[] }[] = [];
    for (let t = 2; t <= 6; t++) {
      const tierMatch = fullText.match(new RegExp(`(?:Tier ${t}|${ordinal(t)}.Tier)[:\\s]*(.+?)(?=(?:Tier ${t + 1}|${ordinal(t + 1)}.Tier|GM Intrusion|$))`, 'is'));
      if (tierMatch) {
        const abilities: AbilityRaw[] = [];
        const abMatches = tierMatch[1].matchAll(/([A-Z][A-Za-z\s]+?)(?:\s*\((\d+\+?\s*(?:Might|Speed|Intellect)\s*points?)\))?\s*:\s*(.+?)(?=\n[A-Z]|\n\n|$)/gs);
        for (const am of abMatches) {
          const aName = am[1].trim();
          if (/^(Tier|Connection|Equipment|GM Intrusion)/i.test(aName)) continue;
          const cost = am[2] ? parseAbilityCost(`(${am[2]})`) : undefined;
          abilities.push({
            id: toKebab(aName),
            name: aName,
            description: am[3].trim(),
            ...(cost ? { cost } : {}),
            type: parseAbilityType(am[3]),
            tier: t,
            source: id,
          });
        }
        if (abilities.length) higherTiers.push({ tier: t, abilities });
      }
    }

    return {
      id,
      name,
      description,
      connection,
      tier1: {
        grantedAbilities: tier1Abilities,
        trainedSkills: tier1Skills,
        additionalEquipment: tier1Equipment,
      },
      higherTiers,
    };
  } catch (e: any) {
    console.error(`Failed to scrape focus ${urlPath}: ${e.message}`);
    return null;
  }
}

function ordinal(n: number): string {
  const ords = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  return ords[n] || `${n}th`;
}

// ─── MAIN ───

async function main() {
  console.log('=== Numenera 2E SRD Scraper ===\n');

  // Create output dirs
  fs.mkdirSync(path.join(DATA_DIR, 'types'), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'descriptors'), { recursive: true });

  // 1. Scrape Types
  console.log('\n--- Scraping Types ---');
  const typePages = ['/glaive', '/nano', '/jack', '/arkus', '/delve', '/wright'];
  for (const tp of typePages) {
    try {
      const typeData = await scrapeType(tp);
      const filename = path.join(DATA_DIR, 'types', `${typeData.id}.json`);
      fs.writeFileSync(filename, JSON.stringify(typeData, null, 2));
      console.log(`  ✓ ${typeData.name}: ${typeData.abilityChoices[0].options.length} abilities, ${typeData.backgrounds.length} backgrounds`);
    } catch (e: any) {
      console.error(`  ✗ Failed to scrape ${tp}: ${e.message}`);
    }
    await sleep(500);
  }

  // 2. Scrape Descriptors
  console.log('\n--- Scraping Descriptors ---');
  const descriptorPages: [string, 'discovery' | 'destiny' | 'location' | 'racial'][] = [
    ['/descriptors', 'discovery'],
    ['/destiny-descriptors', 'destiny'],
    ['/location-descriptors', 'location'],
    ['/racial-options', 'racial'],
  ];

  for (const [page, source] of descriptorPages) {
    try {
      const $ = await fetchPage(page);
      const descriptors = scrapeDescriptorsFromPage($, source);
      const filename = source === 'discovery' ? 'discovery.json'
        : source === 'destiny' ? 'destiny.json'
        : source === 'location' ? 'location-based.json'
        : 'racial.json';
      fs.writeFileSync(path.join(DATA_DIR, 'descriptors', filename), JSON.stringify(descriptors, null, 2));
      console.log(`  ✓ ${source}: ${descriptors.length} descriptors`);
    } catch (e: any) {
      console.error(`  ✗ Failed to scrape ${page}: ${e.message}`);
    }
    await sleep(500);
  }

  // 3. Scrape Foci
  console.log('\n--- Scraping Foci ---');
  let fociLinks = await scrapeFociList();
  console.log(`  Found ${fociLinks.length} focus links`);

  if (fociLinks.length === 0) {
    // Try alternate approach - scrape from foci listing page directly
    console.log('  Trying alternate foci scraping approach...');
    const $ = await fetchPage('/foci');
    const content = $('#page-content');
    // Look for focus names in h3 tags and scrape inline
    const foci: any[] = [];
    content.find('h3').each((_, h3) => {
      const name = $(h3).find('span').text().trim() || $(h3).text().trim();
      if (!name || /overview|general/i.test(name)) return;

      let text = '';
      let el = $(h3).next();
      while (el.length && !el.is('h3,h1,hr')) {
        text += el.text() + '\n';
        el = el.next();
      }

      if (text.length > 20) {
        const id = toKebab(name);
        const connection = text.match(/(?:Connection|Pick one)[.:]\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || '';

        // Simple tier 1 parsing
        const tier1Abilities: AbilityRaw[] = [];
        const trainedSkills: string[] = [];

        const skillMatch = text.match(/trained in (.+?)(?:\.|$)/i);
        if (skillMatch) {
          trainedSkills.push(...skillMatch[1].split(/,| and /).map(s => s.trim().toLowerCase()).filter(s => s));
        }

        foci.push({
          id,
          name,
          description: text.split('\n')[0]?.trim() || '',
          connection,
          tier1: {
            grantedAbilities: tier1Abilities,
            trainedSkills,
            additionalEquipment: [],
          },
          higherTiers: [],
        });
      }
    });

    if (foci.length > 0) {
      fs.writeFileSync(path.join(DATA_DIR, 'foci.json'), JSON.stringify(foci, null, 2));
      console.log(`  ✓ Scraped ${foci.length} foci from listing page`);
    }
  } else {
    const allFoci: any[] = [];
    for (const link of fociLinks) {
      const focus = await scrapeFocus(link);
      if (focus) {
        allFoci.push(focus);
        console.log(`  ✓ ${focus.name}`);
      }
      await sleep(300);
    }
    fs.writeFileSync(path.join(DATA_DIR, 'foci.json'), JSON.stringify(allFoci, null, 2));
    console.log(`  Total: ${allFoci.length} foci`);
  }

  console.log('\n=== Scraping Complete ===');
}

main().catch(e => {
  console.error('Scraper failed:', e);
  process.exit(1);
});
