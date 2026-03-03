import type { Ability } from './Ability';
import type { Weapon } from './Weapon';
import type { ArmorData } from './Armor';

export interface CharacterPools {
  might: { pool: number; edge: number };
  speed: { pool: number; edge: number };
  intellect: { pool: number; edge: number };
}

export interface Character {
  name: string;
  sentence: string;
  tier: 1;
  effort: number;

  typeId: string;
  descriptorId: string;
  focusId: string;

  pools: CharacterPools;
  cypherLimit: number;
  armorSpeedCostReduction: number;

  skills: {
    trained: string[];
    specialized: string[];
    inabilities: string[];
  };

  abilities: Ability[];

  equipment: string[];
  weapons: Weapon[];
  armor: ArmorData;
  shins: number;
  cyphers: string[];

  background: string;
  initialLink: string;
  connection: string;
  notes: string;

  recoveryRollBonus: number;
}
