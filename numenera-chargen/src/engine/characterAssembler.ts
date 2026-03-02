import type { Character } from '../types/Character';
import type { Ability } from '../types/Ability';
import { getTypeById, getDescriptorById, getFocusById } from '../data';
import { calculatePools } from './poolCalculator';
import { resolveSkills } from './skillResolver';
import { resolveEquipment } from './equipmentResolver';

export interface AssemblerInput {
  typeId: string;
  descriptorId: string;
  focusId: string;
  bonusAllocation: { might: number; speed: number; intellect: number };
  jackFlexEdge?: 'might' | 'speed' | 'intellect' | null;
  chosenAbilityIds: string[];
  chosenSkills: string[];
  backgroundName: string;
  initialLink: string;
  connection: string;
  characterName: string;
  notes: string;
}

export function assembleCharacter(input: AssemblerInput): Character | null {
  const type = getTypeById(input.typeId);
  const descriptor = getDescriptorById(input.descriptorId);
  const focus = getFocusById(input.focusId);

  if (!type || !descriptor || !focus) return null;

  // 1. Calculate pools
  const { pools } = calculatePools({
    type,
    descriptor,
    bonusAllocation: input.bonusAllocation,
    jackFlexEdge: input.jackFlexEdge,
  });

  // 2. Resolve skills
  const skills = resolveSkills({
    typeAutoSkills: type.automaticSkills,
    typeChosenSkills: input.chosenSkills,
    descriptorSkills: descriptor.trainedSkills,
    focusSkills: focus.tier1.trainedSkills,
    typeInabilities: type.inabilities,
    descriptorInabilities: descriptor.inabilities,
  });

  // 3. Resolve equipment
  const equipment = resolveEquipment(type, descriptor, focus);

  // 4. Collect abilities
  const abilities: Ability[] = [
    ...type.specialAbilities,
  ];

  // Add descriptor special abilities (convert from plain objects to Ability)
  for (const sa of descriptor.specialAbilities) {
    abilities.push({
      id: sa.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: sa.name,
      description: sa.description,
      type: 'enabler',
      tier: 0,
      source: descriptor.id,
    });
  }

  // Add chosen abilities from type
  for (const choice of type.abilityChoices) {
    for (const option of choice.options) {
      if (input.chosenAbilityIds.includes(option.id)) {
        abilities.push(option);
      }
    }
  }

  // Add focus tier 1 granted abilities
  abilities.push(...focus.tier1.grantedAbilities);

  // Add focus tier 1 chosen abilities (if applicable)
  if (focus.tier1.abilityChoice) {
    for (const option of focus.tier1.abilityChoice.options) {
      if (input.chosenAbilityIds.includes(option.id)) {
        abilities.push(option);
      }
    }
  }

  // 5. Build sentence
  const article = /^[aeiou]/i.test(descriptor.name) ? 'an' : 'a';
  const sentence = `I am ${article} ${descriptor.name} ${type.name} who ${focus.name}.`;

  // 6. Armor speed cost reduction
  const armorSpeedCostReduction = type.trainedInArmor ? 1 : 0;

  // 7. Construct character
  const character: Character = {
    name: input.characterName,
    sentence,
    tier: 1,
    effort: type.effort,
    typeId: type.id,
    descriptorId: descriptor.id,
    focusId: focus.id,
    pools,
    cypherLimit: type.cypherLimit,
    armorSpeedCostReduction,
    skills: {
      trained: skills.trained,
      specialized: skills.specialized,
      inabilities: skills.inabilities,
    },
    abilities,
    equipment: equipment.equipment,
    weapons: equipment.weapons,
    armor: equipment.armor,
    shins: equipment.shins,
    cyphers: Array(type.cypherLimit).fill(''),
    background: input.backgroundName,
    initialLink: input.initialLink,
    connection: input.connection || focus.connection,
    notes: input.notes,
    recoveryRollBonus: 1,
  };

  return character;
}
