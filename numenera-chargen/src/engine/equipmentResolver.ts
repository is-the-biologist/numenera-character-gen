import type { CharacterType } from '../types/CharacterType';
import type { Descriptor } from '../types/Descriptor';
import type { Focus } from '../types/Focus';

export interface EquipmentResult {
  weapons: string[];
  armor: string;
  equipment: string[];
  shins: number;
}

const WEAPON_KEYWORDS = [
  'sword', 'axe', 'mace', 'bow', 'dagger', 'weapon', 'crossbow',
  'spear', 'hammer', 'blade', 'knife', 'whip', 'staff', 'club',
  'javelin', 'dart', 'rapier', 'halberd', 'pike',
];

const ARMOR_KEYWORDS = ['armor', 'shield'];

function isWeapon(item: string): boolean {
  const lower = item.toLowerCase();
  return WEAPON_KEYWORDS.some(k => lower.includes(k));
}

function isArmor(item: string): boolean {
  const lower = item.toLowerCase();
  return ARMOR_KEYWORDS.some(k => lower.includes(k));
}

function isShins(item: string): boolean {
  return /\bshins?\b/i.test(item);
}

function parseShins(item: string): number {
  const match = item.match(/(\d+)\s*(?:extra\s+)?shins?/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function resolveEquipment(
  type: CharacterType,
  descriptor: Descriptor,
  focus: Focus
): EquipmentResult {
  const allItems = [
    ...type.startingEquipment,
    ...descriptor.additionalEquipment,
    ...focus.tier1.additionalEquipment,
  ];

  const weapons: string[] = [];
  const equipment: string[] = [];
  let armor = 'none';
  let shins = type.shins;

  for (const item of allItems) {
    if (isShins(item)) {
      shins += parseShins(item);
    } else if (isArmor(item)) {
      armor = item;
    } else if (isWeapon(item)) {
      weapons.push(item);
    } else {
      equipment.push(item);
    }
  }

  return { weapons, armor, equipment, shins };
}
