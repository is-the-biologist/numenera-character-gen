import type { CharacterType } from '../types/CharacterType';
import type { Descriptor } from '../types/Descriptor';
import type { CharacterPools } from '../types/Character';

export interface PoolAllocation {
  might: number;
  speed: number;
  intellect: number;
}

export interface PoolCalculatorInput {
  type: CharacterType;
  descriptor: Descriptor;
  bonusAllocation: PoolAllocation;
  jackFlexEdge?: 'might' | 'speed' | 'intellect' | null;
}

export interface PoolCalculatorResult {
  pools: CharacterPools;
  errors: string[];
}

export function calculatePools(input: PoolCalculatorInput): PoolCalculatorResult {
  const { type, descriptor, bonusAllocation, jackFlexEdge } = input;
  const errors: string[] = [];

  // Validate bonus allocation
  const totalAllocated = bonusAllocation.might + bonusAllocation.speed + bonusAllocation.intellect;
  if (totalAllocated !== type.bonusPoolPoints) {
    errors.push(
      `You must allocate all ${type.bonusPoolPoints} bonus pool points (currently allocated: ${totalAllocated})`
    );
  }
  if (bonusAllocation.might < 0 || bonusAllocation.speed < 0 || bonusAllocation.intellect < 0) {
    errors.push('Bonus allocation values cannot be negative');
  }

  // Validate flex edge
  if (jackFlexEdge && !type.flexEdge) {
    errors.push('Flex Edge can only be allocated for Jacks');
  }
  if (type.flexEdge && !jackFlexEdge) {
    errors.push('Jack must allocate 1 flex Edge point to Might, Speed, or Intellect');
  }

  // Calculate pools
  const pools: CharacterPools = {
    might: {
      pool:
        type.basePools.might +
        (descriptor.poolModifiers.might ?? 0) +
        bonusAllocation.might,
      edge:
        type.baseEdge.might +
        (descriptor.edgeModifiers?.might ?? 0) +
        (jackFlexEdge === 'might' ? 1 : 0),
    },
    speed: {
      pool:
        type.basePools.speed +
        (descriptor.poolModifiers.speed ?? 0) +
        bonusAllocation.speed,
      edge:
        type.baseEdge.speed +
        (descriptor.edgeModifiers?.speed ?? 0) +
        (jackFlexEdge === 'speed' ? 1 : 0),
    },
    intellect: {
      pool:
        type.basePools.intellect +
        (descriptor.poolModifiers.intellect ?? 0) +
        bonusAllocation.intellect,
      edge:
        type.baseEdge.intellect +
        (descriptor.edgeModifiers?.intellect ?? 0) +
        (jackFlexEdge === 'intellect' ? 1 : 0),
    },
  };

  // Ensure no pool drops below 1
  for (const stat of ['might', 'speed', 'intellect'] as const) {
    if (pools[stat].pool < 1) {
      errors.push(`${stat.charAt(0).toUpperCase() + stat.slice(1)} pool cannot be less than 1`);
    }
  }

  return { pools, errors };
}
