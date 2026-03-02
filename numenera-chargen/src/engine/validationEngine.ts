import { getTypeById, getDescriptorById, getFocusById } from '../data';

export interface ValidationInput {
  typeId: string | null;
  descriptorId: string | null;
  focusId: string | null;
  bonusAllocation: { might: number; speed: number; intellect: number };
  jackFlexEdge: 'might' | 'speed' | 'intellect' | null;
  chosenAbilityIds: string[];
  chosenSkills: string[];
  characterName: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCharacter(input: ValidationInput): ValidationResult {
  const errors: string[] = [];

  // 1. Type must be set and exist
  if (!input.typeId) {
    errors.push('You must select a Type');
  }
  const type = input.typeId ? getTypeById(input.typeId) : undefined;
  if (input.typeId && !type) {
    errors.push(`Unknown Type: ${input.typeId}`);
  }

  // 2. Descriptor must be set and exist
  if (!input.descriptorId) {
    errors.push('You must select a Descriptor');
  }
  const descriptor = input.descriptorId ? getDescriptorById(input.descriptorId) : undefined;
  if (input.descriptorId && !descriptor) {
    errors.push(`Unknown Descriptor: ${input.descriptorId}`);
  }

  // 3. Focus must be set and exist
  if (!input.focusId) {
    errors.push('You must select a Focus');
  }
  const focus = input.focusId ? getFocusById(input.focusId) : undefined;
  if (input.focusId && !focus) {
    errors.push(`Unknown Focus: ${input.focusId}`);
  }

  if (type) {
    // 4. Bonus allocation must sum to bonusPoolPoints
    const { might, speed, intellect } = input.bonusAllocation;
    if (might < 0 || speed < 0 || intellect < 0) {
      errors.push('Bonus pool allocation values cannot be negative');
    }
    const total = might + speed + intellect;
    if (total !== type.bonusPoolPoints) {
      errors.push(
        `You must allocate all ${type.bonusPoolPoints} bonus pool points (currently allocated: ${total})`
      );
    }

    // 5. Jack flex edge
    if (type.flexEdge && !input.jackFlexEdge) {
      errors.push('Jack must allocate 1 flex Edge point to Might, Speed, or Intellect');
    }
    if (!type.flexEdge && input.jackFlexEdge) {
      errors.push('Flex Edge can only be allocated for Jacks');
    }

    // 6. Ability count
    const requiredAbilityCount = type.abilityChoices.reduce((sum, c) => sum + c.pickCount, 0);
    if (input.chosenAbilityIds.length !== requiredAbilityCount) {
      errors.push(
        `You must choose ${requiredAbilityCount} abilities (currently chosen: ${input.chosenAbilityIds.length})`
      );
    }

    // 7. All chosen abilities must exist in type's options
    const validAbilityIds = new Set(
      type.abilityChoices.flatMap(c => c.options.map(o => o.id))
    );
    for (const id of input.chosenAbilityIds) {
      if (!validAbilityIds.has(id)) {
        errors.push(`Unknown ability: ${id}`);
      }
    }

    // 8. Skill choices count (filter empty strings from freeform inputs)
    const requiredSkillCount = type.skillChoices.reduce((sum, c) => sum + c.pickCount, 0);
    const filledSkillCount = input.chosenSkills.filter(s => s.trim() !== '').length;
    if (filledSkillCount !== requiredSkillCount) {
      errors.push(
        `You must choose ${requiredSkillCount} skills (currently chosen: ${filledSkillCount})`
      );
    }
  }

  // 9. Character name
  if (!input.characterName.trim()) {
    errors.push('Character name is required');
  }

  return { valid: errors.length === 0, errors };
}
