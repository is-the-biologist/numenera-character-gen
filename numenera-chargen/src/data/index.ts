import glaive from './types/glaive.json';
import nano from './types/nano.json';
import jack from './types/jack.json';
import arkus from './types/arkus.json';
import delve from './types/delve.json';
import wright from './types/wright.json';
import discoveryDescriptors from './descriptors/discovery.json';
import destinyDescriptors from './descriptors/destiny.json';
import locationDescriptors from './descriptors/location-based.json';
import racialDescriptors from './descriptors/racial.json';
import foci from './foci.json';
import weaponsData from './weapons.json';

import type { CharacterType } from '../types/CharacterType';
import type { Descriptor } from '../types/Descriptor';
import type { Focus } from '../types/Focus';
import type { Weapon, WeaponCategory } from '../types/Weapon';

export const allTypes: CharacterType[] = [glaive, nano, jack, arkus, delve, wright] as CharacterType[];
export const allDescriptors: Descriptor[] = [
  ...discoveryDescriptors,
  ...destinyDescriptors,
  ...locationDescriptors,
  ...racialDescriptors,
] as Descriptor[];
export const allFoci: Focus[] = foci as Focus[];

export const allWeapons: Weapon[] = weaponsData as Weapon[];
export const getWeaponsByCategory = (category: WeaponCategory): Weapon[] =>
  allWeapons.filter(w => w.category === category);
export const getWeaponById = (id: string): Weapon | undefined =>
  allWeapons.find(w => w.id === id);

export const getTypeById = (id: string): CharacterType | undefined => allTypes.find(t => t.id === id);
export const getDescriptorById = (id: string): Descriptor | undefined => allDescriptors.find(d => d.id === id);
export const getFocusById = (id: string): Focus | undefined => allFoci.find(f => f.id === id);
