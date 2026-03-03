import type { CharacterType } from '../types/CharacterType';
import type { Descriptor } from '../types/Descriptor';
import type { Focus } from '../types/Focus';
import type { Weapon } from '../types/Weapon';
import type { ArmorData, ArmorCategory } from '../types/Armor';
import { ARMOR_STATS } from '../types/Armor';
import { getWeaponById } from '../data';

export interface EquipmentResult {
  weapons: Weapon[];
  armor: ArmorData;
  equipment: string[];
  shins: number;
}

const WEAPON_KEYWORDS = [
  'sword', 'axe', 'mace', 'bow', 'dagger', 'weapon', 'crossbow',
  'spear', 'hammer', 'blade', 'knife', 'whip', 'staff', 'club',
  'javelin', 'dart', 'rapier', 'halberd', 'pike',
];

const ARMOR_KEYWORDS = ['armor', 'shield'];

function isWeaponString(item: string): boolean {
  const lower = item.toLowerCase();
  return WEAPON_KEYWORDS.some(k => lower.includes(k));
}

function isArmorString(item: string): boolean {
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function resolveEquipment(
  type: CharacterType,
  descriptor: Descriptor,
  focus: Focus,
  selectedWeaponIds: string[],
  selectedArmorCategory: ArmorCategory | null,
  selectedShield: boolean,
): EquipmentResult {
  // 1. Resolve weapons from structured selections
  const weapons = selectedWeaponIds
    .map(id => getWeaponById(id))
    .filter((w): w is Weapon => w !== undefined);

  // 2. Resolve armor
  const armorCategory = selectedArmorCategory ?? 'none';
  const armorStats = ARMOR_STATS[armorCategory];
  const armor: ArmorData = {
    category: armorCategory,
    armorPoints: armorStats.armorPoints,
    speedEffortPenalty: armorStats.speedEffortPenalty,
    name: armorCategory === 'none' ? 'None' : `${capitalize(armorCategory)} armor`,
  };

  // 3. Aggregate general equipment from type + descriptor + focus
  //    Filter out weapon/armor placeholder strings since those are now handled structurally
  const allItems = [
    ...type.startingEquipment,
    ...descriptor.additionalEquipment,
    ...focus.tier1.additionalEquipment,
  ];

  const equipment: string[] = [];
  let shins = type.shins;

  if (selectedShield) {
    equipment.push('Shield (asset to Speed defense)');
  }

  for (const item of allItems) {
    if (isShins(item)) {
      shins += parseShins(item);
    } else if (isWeaponString(item) || isArmorString(item)) {
      // Skip — these are now handled by structured selections
    } else {
      equipment.push(item);
    }
  }

  return { weapons, armor, equipment, shins };
}

/**
 * Determines the effective skill level for a weapon attack.
 *
 * Returns: "T" (trained), "S" (specialized), "I" (inability), or "—" (practiced/no modifier)
 */
export function getWeaponSkillLevel(
  weapon: Weapon,
  typeProficiency: CharacterType['weaponProficiency'],
  trainedSkills: string[],
  specializedSkills: string[],
): 'T' | 'S' | 'I' | '-' {
  // Step 1: Determine base proficiency
  let hasInability = false;
  if (typeProficiency === 'light-only' && (weapon.category === 'medium' || weapon.category === 'heavy')) {
    hasInability = true;
  }
  if (typeProficiency === 'light-and-medium' && weapon.category === 'heavy') {
    hasInability = true;
  }

  // Step 2: Check for skill training that applies to this weapon
  const isTrained = trainedSkills.some(s =>
    s.toLowerCase().includes(weapon.category) ||
    s.toLowerCase().includes(weapon.name.toLowerCase())
  );
  const isSpecialized = specializedSkills.some(s =>
    s.toLowerCase().includes(weapon.category) ||
    s.toLowerCase().includes(weapon.name.toLowerCase())
  );

  // Step 3: Resolve
  if (isSpecialized) return 'S';
  if (isTrained && hasInability) return '-'; // Training cancels inability
  if (isTrained) return 'T';
  if (hasInability) return 'I';
  return '-'; // Practiced — no modifier
}
