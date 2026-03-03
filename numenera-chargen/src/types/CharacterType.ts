import type { Ability } from './Ability';
import type { WeaponCategory } from './Weapon';
import type { ArmorCategory } from './Armor';

export interface WeaponChoice {
  count: number;
  allowedCategories: WeaponCategory[];
  orShield?: boolean;
}

export interface ArmorChoice {
  allowedCategories: ArmorCategory[];
}

export interface SkillChoice {
  label: string;
  pickCount: number;
  options: string[];
  freeform: boolean;
}

export interface AbilityChoice {
  label: string;
  pickCount: number;
  options: Ability[];
}

export interface Background {
  name: string;
  description: string;
}

export interface CharacterType {
  id: string;
  name: string;
  description: string;
  basePools: {
    might: number;
    speed: number;
    intellect: number;
  };
  bonusPoolPoints: number;
  baseEdge: {
    might: number;
    speed: number;
    intellect: number;
  };
  flexEdge?: number;
  effort: number;
  cypherLimit: number;
  weaponProficiency: "all" | "light-and-medium" | "light-only";
  trainedInArmor: boolean;
  practiceWithAllWeapons: boolean;
  startingEquipment: string[];
  shins: number;
  backgrounds: Background[];
  abilityChoices: AbilityChoice[];
  skillChoices: SkillChoice[];
  automaticSkills: string[];
  inabilities: string[];
  specialAbilities: Ability[];
  weaponChoices?: WeaponChoice;
  armorChoice?: ArmorChoice;
}
