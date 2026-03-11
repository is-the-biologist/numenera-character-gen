/**
 * Validates all foci data for common parsing errors.
 * Run: npx tsx scripts/validate-foci.ts
 */

import fociData from '../src/data/foci.json';

let errors = 0;

for (const focus of fociData) {
  const name = focus.name;

  // CHECK 1: Tier 1 must have at least one ability
  if (!focus.tier1?.grantedAbilities?.length && !focus.tier1?.abilityChoice) {
    console.error(`[${name}] ERROR: No Tier 1 abilities found`);
    errors++;
  }

  // CHECK 2: Equipment should not contain ability-like text
  for (const item of focus.tier1?.additionalEquipment || []) {
    if (/\bEnabler\b|\bAction\b|\bIntellect point/i.test(item)) {
      console.error(`[${name}] ERROR: Equipment contains ability text: "${item.slice(0, 80)}..."`);
      errors++;
    }
    if (/^Tier \d/i.test(item)) {
      console.error(`[${name}] ERROR: Equipment contains tier marker: "${item.slice(0, 80)}..."`);
      errors++;
    }
  }

  // CHECK 3: Equipment should not contain "Minor Effect" or "Major Effect" text
  for (const item of focus.tier1?.additionalEquipment || []) {
    if (/Minor Effect|Major Effect/i.test(item)) {
      console.error(`[${name}] ERROR: Equipment contains effect suggestion text`);
      errors++;
    }
  }

  // CHECK 4: Equipment items should not be duplicated
  const equipSet = new Set(focus.tier1?.additionalEquipment || []);
  if (equipSet.size !== (focus.tier1?.additionalEquipment || []).length) {
    console.error(`[${name}] ERROR: Duplicate equipment items`);
    errors++;
  }

  // CHECK 5: Ability descriptions should not contain "Additional Equipment:"
  for (const ability of focus.tier1?.grantedAbilities || []) {
    if (/Additional Equipment:/i.test(ability.description)) {
      console.error(`[${name}] ERROR: Ability description contains equipment section`);
      errors++;
    }
  }

  // CHECK 6: Description should not contain tier text
  if (/^Tier \d:/m.test(focus.description || '')) {
    console.error(`[${name}] ERROR: Description contains tier text`);
    errors++;
  }

  // CHECK 7: Connection should exist and not be empty
  if (!focus.connection || focus.connection.trim().length < 10) {
    console.error(`[${name}] WARNING: Missing or very short connection text`);
    errors++;
  }

  // CHECK 8: Equipment items should be reasonably short (< 500 chars)
  for (const item of focus.tier1?.additionalEquipment || []) {
    if (item.length > 500) {
      console.error(`[${name}] WARNING: Equipment item suspiciously long (${item.length} chars): "${item.slice(0, 80)}..."`);
      errors++;
    }
  }

  // CHECK 9: No "[Focus] Powers/Abilities" text in equipment
  for (const item of focus.tier1?.additionalEquipment || []) {
    if (/Powers:|Abilities:|Ability:/i.test(item)) {
      console.error(`[${name}] ERROR: Equipment contains flavor section ("...Powers:" or "...Abilities:")`);
      errors++;
    }
  }
}

console.log(`\nValidation complete: ${errors} error(s) found across ${fociData.length} foci.`);
process.exit(errors > 0 ? 1 : 0);
