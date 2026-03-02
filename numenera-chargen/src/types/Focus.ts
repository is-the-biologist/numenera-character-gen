import type { Ability } from './Ability';

export interface Focus {
  id: string;
  name: string;
  description: string;
  connection: string;
  tier1: {
    grantedAbilities: Ability[];
    abilityChoice?: {
      pickCount: number;
      options: Ability[];
    };
    trainedSkills: string[];
    additionalEquipment: string[];
  };
  higherTiers: {
    tier: number;
    abilities: Ability[];
  }[];
}
