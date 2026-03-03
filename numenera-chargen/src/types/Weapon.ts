// src/types/Weapon.ts

export type WeaponCategory = 'light' | 'medium' | 'heavy';
export type WeaponRange = 'immediate' | 'short' | 'long';

export interface Weapon {
  id: string;              // Kebab-case: "broadsword", "heavy-crossbow"
  name: string;            // Display name: "Broadsword", "Heavy Crossbow"
  category: WeaponCategory;
  damage: number;          // 2 (light), 4 (medium), or 6 (heavy)
  range: WeaponRange;      // Primary range
  price: number;           // In shins (0 for unarmed)
  notes: string;           // Empty string if none
  twoHanded: boolean;      // True for all heavy weapons + some medium
}
