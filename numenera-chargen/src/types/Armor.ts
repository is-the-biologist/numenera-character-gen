// src/types/Armor.ts

export type ArmorCategory = 'none' | 'light' | 'medium' | 'heavy';

export interface ArmorData {
  category: ArmorCategory;
  armorPoints: number;           // 0, 1, 2, or 3
  speedEffortPenalty: number;    // Additional cost per level of Speed Effort: 0, 1, 2, or 3
  name: string;                  // Display name chosen by player, e.g., "Leather jerkin"
}

export const ARMOR_STATS: Record<ArmorCategory, { armorPoints: number; speedEffortPenalty: number }> = {
  none:   { armorPoints: 0, speedEffortPenalty: 0 },
  light:  { armorPoints: 1, speedEffortPenalty: 1 },
  medium: { armorPoints: 2, speedEffortPenalty: 2 },
  heavy:  { armorPoints: 3, speedEffortPenalty: 3 },
};
