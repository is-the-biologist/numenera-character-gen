import { describe, it, expect } from 'vitest';
import { resolveSkills } from '../skillResolver';

describe('skillResolver', () => {
  it('merges skills from all sources with no conflicts', () => {
    const result = resolveSkills({
      typeAutoSkills: [],
      typeChosenSkills: ['climbing'],
      descriptorSkills: ['intimidation'],
      focusSkills: ['searching', 'listening'],
      typeInabilities: [],
      descriptorInabilities: [],
    });
    expect(result.trained.sort()).toEqual(
      ['climbing', 'intimidation', 'searching', 'listening'].sort()
    );
    expect(result.specialized).toHaveLength(0);
    expect(result.inabilities).toHaveLength(0);
    expect(result.cancellations).toHaveLength(0);
  });

  it('cancels trained + inability (trained wins, both removed)', () => {
    const result = resolveSkills({
      typeAutoSkills: [],
      typeChosenSkills: ['balancing'],
      descriptorSkills: [],
      focusSkills: [],
      typeInabilities: [],
      descriptorInabilities: ['balancing'],
    });
    expect(result.trained).not.toContain('balancing');
    expect(result.inabilities).not.toContain('balancing');
    expect(result.cancellations.length).toBe(1);
    expect(result.cancellations[0]).toContain('balancing');
  });

  it('promotes trained + trained from different sources to specialized', () => {
    const result = resolveSkills({
      typeAutoSkills: [],
      typeChosenSkills: ['climbing'],
      descriptorSkills: [],
      focusSkills: ['climbing', 'searching'],
      typeInabilities: [],
      descriptorInabilities: [],
    });
    expect(result.specialized).toContain('climbing');
    expect(result.trained).not.toContain('climbing');
    expect(result.trained).toContain('searching');
  });

  it('handles multiple cancellations in one character', () => {
    const result = resolveSkills({
      typeAutoSkills: [],
      typeChosenSkills: ['swimming', 'jumping'],
      descriptorSkills: [],
      focusSkills: [],
      typeInabilities: [],
      descriptorInabilities: ['swimming', 'jumping'],
    });
    expect(result.trained).not.toContain('swimming');
    expect(result.trained).not.toContain('jumping');
    expect(result.inabilities).not.toContain('swimming');
    expect(result.inabilities).not.toContain('jumping');
    expect(result.cancellations).toHaveLength(2);
  });

  it('deduplicates inabilities', () => {
    const result = resolveSkills({
      typeAutoSkills: [],
      typeChosenSkills: [],
      descriptorSkills: [],
      focusSkills: [],
      typeInabilities: ['crafting numenera', 'crafting numenera'],
      descriptorInabilities: ['crafting numenera'],
    });
    expect(result.inabilities).toEqual(['crafting numenera']);
  });
});
