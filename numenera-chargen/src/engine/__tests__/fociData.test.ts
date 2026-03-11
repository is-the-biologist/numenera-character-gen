import { describe, test, expect } from 'vitest';
import fociData from '../../data/foci.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const foci = fociData as any[];

describe('Foci data integrity', () => {
  test.each(foci.map(f => [f.name, f]))('%s has valid structure', (_name, focus) => {
    // Tier 1 has at least one ability
    expect(
      (focus.tier1?.grantedAbilities?.length || 0) + (focus.tier1?.abilityChoice ? 1 : 0)
    ).toBeGreaterThan(0);

    // Equipment does not contain ability text
    for (const item of focus.tier1?.additionalEquipment || []) {
      expect(item).not.toMatch(/\bEnabler\b|\bAction to/i);
      expect(item).not.toMatch(/^Tier \d/i);
      expect(item).not.toMatch(/Minor Effect|Major Effect/i);
      expect(item).not.toMatch(/Powers:|Abilities:|Ability:/i);
    }

    // No duplicate equipment
    const equip = focus.tier1?.additionalEquipment || [];
    expect(new Set(equip).size).toBe(equip.length);
  });
});
