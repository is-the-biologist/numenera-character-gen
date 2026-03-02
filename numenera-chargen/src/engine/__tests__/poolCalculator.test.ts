import { describe, it, expect } from 'vitest';
import { calculatePools } from '../poolCalculator';
import type { CharacterType } from '../../types/CharacterType';
import type { Descriptor } from '../../types/Descriptor';

// Minimal fixtures — only the fields poolCalculator actually reads

const glaiveType: CharacterType = {
  id: 'glaive',
  name: 'Glaive',
  description: '',
  basePools: { might: 11, speed: 10, intellect: 7 },
  bonusPoolPoints: 6,
  baseEdge: { might: 1, speed: 1, intellect: 0 },
  effort: 1,
  cypherLimit: 2,
  weaponProficiency: 'all',
  trainedInArmor: true,
  practiceWithAllWeapons: true,
  startingEquipment: [],
  shins: 5,
  backgrounds: [],
  abilityChoices: [],
  skillChoices: [],
  automaticSkills: [],
  inabilities: [],
  specialAbilities: [],
};

const jackType: CharacterType = {
  ...glaiveType,
  id: 'jack',
  name: 'Jack',
  basePools: { might: 10, speed: 10, intellect: 10 },
  baseEdge: { might: 0, speed: 0, intellect: 0 },
  flexEdge: 1,
};

const emptyDescriptor: Descriptor = {
  id: 'empty',
  name: 'Empty',
  source: 'discovery',
  description: '',
  poolModifiers: {},
  trainedSkills: [],
  inabilities: [],
  specialAbilities: [],
  additionalEquipment: [],
  initialLinks: [],
};

const toughDescriptor: Descriptor = {
  ...emptyDescriptor,
  id: 'tough',
  name: 'Tough',
  poolModifiers: { might: 1 },
};

const negativeDescriptor: Descriptor = {
  ...emptyDescriptor,
  id: 'negative-test',
  name: 'NegTest',
  poolModifiers: { might: -2, intellect: 4 },
};

describe('poolCalculator', () => {
  it('computes Glaive base pools correctly', () => {
    const result = calculatePools({
      type: glaiveType,
      descriptor: emptyDescriptor,
      bonusAllocation: { might: 2, speed: 2, intellect: 2 },
    });
    expect(result.errors).toHaveLength(0);
    expect(result.pools.might).toEqual({ pool: 13, edge: 1 });
    expect(result.pools.speed).toEqual({ pool: 12, edge: 1 });
    expect(result.pools.intellect).toEqual({ pool: 9, edge: 0 });
  });

  it('applies positive Descriptor modifier (Tough +1 Might)', () => {
    const result = calculatePools({
      type: glaiveType,
      descriptor: toughDescriptor,
      bonusAllocation: { might: 3, speed: 2, intellect: 1 },
    });
    expect(result.errors).toHaveLength(0);
    // 11 base + 1 Tough + 3 allocation = 15
    expect(result.pools.might.pool).toBe(15);
    // Speed unaffected: 10 + 0 + 2 = 12
    expect(result.pools.speed.pool).toBe(12);
    // Intellect unaffected: 7 + 0 + 1 = 8
    expect(result.pools.intellect.pool).toBe(8);
  });

  it('applies negative Descriptor modifier', () => {
    const result = calculatePools({
      type: glaiveType,
      descriptor: negativeDescriptor,
      bonusAllocation: { might: 2, speed: 2, intellect: 2 },
    });
    expect(result.errors).toHaveLength(0);
    // 11 - 2 + 2 = 11
    expect(result.pools.might.pool).toBe(11);
    // 7 + 4 + 2 = 13
    expect(result.pools.intellect.pool).toBe(13);
  });

  it('distributes bonus allocation correctly', () => {
    const result = calculatePools({
      type: glaiveType,
      descriptor: emptyDescriptor,
      bonusAllocation: { might: 6, speed: 0, intellect: 0 },
    });
    expect(result.errors).toHaveLength(0);
    expect(result.pools.might.pool).toBe(17); // 11 + 6
    expect(result.pools.speed.pool).toBe(10); // unchanged
    expect(result.pools.intellect.pool).toBe(7); // unchanged
  });

  it('rejects allocation that does not sum to bonusPoolPoints', () => {
    const result = calculatePools({
      type: glaiveType,
      descriptor: emptyDescriptor,
      bonusAllocation: { might: 1, speed: 1, intellect: 1 },
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('bonus pool points'))).toBe(true);
  });

  it('applies Jack flex Edge to correct stat', () => {
    const result = calculatePools({
      type: jackType,
      descriptor: emptyDescriptor,
      bonusAllocation: { might: 2, speed: 2, intellect: 2 },
      jackFlexEdge: 'speed',
    });
    expect(result.errors).toHaveLength(0);
    expect(result.pools.might.edge).toBe(0);
    expect(result.pools.speed.edge).toBe(1); // 0 base + 1 flex
    expect(result.pools.intellect.edge).toBe(0);
  });

  it('rejects non-Jack with flexEdge set', () => {
    const result = calculatePools({
      type: glaiveType,
      descriptor: emptyDescriptor,
      bonusAllocation: { might: 2, speed: 2, intellect: 2 },
      jackFlexEdge: 'might',
    });
    expect(result.errors.some(e => e.includes('Flex Edge'))).toBe(true);
  });
});
