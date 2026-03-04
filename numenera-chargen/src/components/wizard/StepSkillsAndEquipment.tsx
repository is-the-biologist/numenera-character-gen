import { useCharacterStore } from '../../store/useCharacterStore';
import { getTypeById, getDescriptorById, getFocusById, getWeaponsByCategory, allWeapons } from '../../data';
import { resolveSkills } from '../../engine/skillResolver';
import { resolveEquipment } from '../../engine/equipmentResolver';
import type { WeaponCategory } from '../../types/Weapon';
import type { ArmorCategory } from '../../types/Armor';
import { ARMOR_STATS } from '../../types/Armor';
import { useState } from 'react';

export default function StepSkillsAndEquipment() {
  const store = useCharacterStore();
  const {
    typeId, descriptorId, focusId,
    chosenSkills, setChosenSkills,
    chosenDescriptorSkills, setChosenDescriptorSkills,
    selectedWeaponIds, selectWeapon,
    selectedShield, toggleShield,
    selectedArmorCategory, selectArmorCategory,
  } = store;

  const type = typeId ? getTypeById(typeId) : undefined;
  const descriptor = descriptorId ? getDescriptorById(descriptorId) : undefined;
  const focus = focusId ? getFocusById(focusId) : undefined;

  // Track selected category per weapon slot for the two-step category→weapon selection
  const [slotCategories, setSlotCategories] = useState<(WeaponCategory | '')[]>([]);

  if (!type) return <p className="text-slate-400">Please select a Type first.</p>;

  // Build a flat list of skill slots from all skill choices.
  const skillSlots: { label: string; slotIndex: number; options: string[]; freeform: boolean; pickNum: number; pickTotal: number }[] = [];
  let slotIndex = 0;
  for (const choice of type.skillChoices) {
    for (let p = 0; p < choice.pickCount; p++) {
      skillSlots.push({
        label: choice.label,
        slotIndex,
        options: choice.options,
        freeform: choice.freeform,
        pickNum: p + 1,
        pickTotal: choice.pickCount,
      });
      slotIndex++;
    }
  }

  const handleSkillSelect = (index: number, value: string) => {
    const newSkills = [...chosenSkills];
    while (newSkills.length <= index) newSkills.push('');
    newSkills[index] = value;
    setChosenSkills(newSkills);
  };

  // Build descriptor skill choice slots
  const descriptorSkillSlots: { label: string; slotIndex: number; options: string[]; freeform: boolean; pickNum: number; pickTotal: number }[] = [];
  if (descriptor?.skillChoices) {
    let descSlotIndex = 0;
    for (const choice of descriptor.skillChoices) {
      for (let p = 0; p < choice.pickCount; p++) {
        descriptorSkillSlots.push({
          label: choice.label,
          slotIndex: descSlotIndex,
          options: choice.options,
          freeform: choice.freeform,
          pickNum: p + 1,
          pickTotal: choice.pickCount,
        });
        descSlotIndex++;
      }
    }
  }

  const handleDescriptorSkillSelect = (index: number, value: string) => {
    const newSkills = [...chosenDescriptorSkills];
    while (newSkills.length <= index) newSkills.push('');
    newSkills[index] = value;
    setChosenDescriptorSkills(newSkills);
  };

  // Compute skill resolution preview
  const skills = resolveSkills({
    typeAutoSkills: type.automaticSkills,
    typeChosenSkills: chosenSkills.filter(Boolean),
    descriptorSkills: [...(descriptor?.trainedSkills ?? []), ...chosenDescriptorSkills.filter(Boolean)],
    focusSkills: focus?.tier1.trainedSkills ?? [],
    typeInabilities: type.inabilities,
    descriptorInabilities: descriptor?.inabilities ?? [],
  });

  // Compute equipment preview
  const equipment = type && descriptor && focus
    ? resolveEquipment(type, descriptor, focus, selectedWeaponIds, selectedArmorCategory, selectedShield)
    : null;

  // Weapon selection helpers
  const weaponChoices = type.weaponChoices;
  const armorChoice = type.armorChoice;
  const weaponSlotCount = weaponChoices
    ? (selectedShield ? weaponChoices.count - 1 : weaponChoices.count)
    : 0;

  const handleCategoryChange = (slotIdx: number, category: WeaponCategory | '') => {
    const newCats = [...slotCategories];
    newCats[slotIdx] = category;
    setSlotCategories(newCats);
    // Clear weapon selection for this slot when category changes
    selectWeapon(slotIdx, '');
  };

  const handleWeaponChange = (slotIdx: number, weaponId: string) => {
    selectWeapon(slotIdx, weaponId);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 6: Skills & Equipment</h2>

      {/* Skill Choices */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Skill Choices</h3>
        {skillSlots.map((slot) => (
          <div key={slot.slotIndex} className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {slot.label}
              {slot.pickTotal > 1 && ` (${slot.pickNum} of ${slot.pickTotal})`}
            </label>
            {slot.freeform ? (
              <input
                type="text"
                value={chosenSkills[slot.slotIndex] ?? ''}
                onChange={e => handleSkillSelect(slot.slotIndex, e.target.value)}
                placeholder="Enter a skill name..."
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            ) : (
              <select
                value={chosenSkills[slot.slotIndex] ?? ''}
                onChange={e => handleSkillSelect(slot.slotIndex, e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">— Select —</option>
                {slot.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* Descriptor Skill Choices */}
      {descriptorSkillSlots.length > 0 && descriptor && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">
            {descriptor.name} Skill Choices
          </h3>
          {descriptorSkillSlots.map((slot) => (
            <div key={`desc-${slot.slotIndex}`} className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {slot.label}
                {slot.pickTotal > 1 && ` (${slot.pickNum} of ${slot.pickTotal})`}
              </label>
              {slot.freeform ? (
                <input
                  type="text"
                  value={chosenDescriptorSkills[slot.slotIndex] ?? ''}
                  onChange={e => handleDescriptorSkillSelect(slot.slotIndex, e.target.value)}
                  placeholder="Enter a skill name..."
                  className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              ) : (
                <select
                  value={chosenDescriptorSkills[slot.slotIndex] ?? ''}
                  onChange={e => handleDescriptorSkillSelect(slot.slotIndex, e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {slot.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skill Resolution Summary */}
      <div className="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold text-slate-200 mb-3">Skill Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="text-emerald-400 font-medium mb-1">Specialized</h4>
            {skills.specialized.length > 0
              ? skills.specialized.map(s => <p key={s} className="text-slate-300">- {s}</p>)
              : <p className="text-slate-500 italic">None</p>
            }
          </div>
          <div>
            <h4 className="text-cyan-400 font-medium mb-1">Trained</h4>
            {skills.trained.length > 0
              ? skills.trained.map(s => <p key={s} className="text-slate-300">- {s}</p>)
              : <p className="text-slate-500 italic">None</p>
            }
          </div>
          <div>
            <h4 className="text-red-400 font-medium mb-1">Inabilities</h4>
            {skills.inabilities.length > 0
              ? skills.inabilities.map(s => <p key={s} className="text-slate-300">- {s}</p>)
              : <p className="text-slate-500 italic">None</p>
            }
          </div>
        </div>
        {skills.cancellations.length > 0 && (
          <div className="mt-3 border-t border-slate-700 pt-3">
            <h4 className="text-amber-400 font-medium mb-1 text-sm">Cancellations</h4>
            {skills.cancellations.map((c, i) => (
              <p key={i} className="text-xs text-slate-400">{c}</p>
            ))}
          </div>
        )}
      </div>

      {/* Weapon Selection */}
      {weaponChoices && (
        <div className="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-200 mb-3">Choose Your Weapons</h3>
          <p className="text-sm text-slate-400 mb-4">
            Your Type grants you {weaponChoices.count} weapon{weaponChoices.count > 1 ? 's' : ''}.
          </p>

          {weaponChoices.orShield && (
            <label className="flex items-center gap-2 mb-4 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedShield}
                onChange={e => toggleShield(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              Use a shield instead of one weapon (grants +1 Asset to Speed defense)
            </label>
          )}

          {Array.from({ length: weaponSlotCount }).map((_, idx) => {
            const cat = slotCategories[idx] || '';
            const weaponsInCat = cat ? getWeaponsByCategory(cat as WeaponCategory) : [];
            const selectedId = selectedWeaponIds[idx] || '';
            const selectedWeapon = allWeapons.find(w => w.id === selectedId);

            return (
              <div key={idx} className="mb-4 border border-slate-700 rounded p-3">
                <p className="text-sm font-medium text-slate-300 mb-2">Weapon {idx + 1}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Category</label>
                    <select
                      value={cat}
                      onChange={e => handleCategoryChange(idx, e.target.value as WeaponCategory | '')}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">— Select Category —</option>
                      {weaponChoices.allowedCategories.map(c => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)} ({c === 'light' ? '2 dmg, eases attack' : c === 'medium' ? '4 dmg' : '6 dmg, two-handed'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Weapon</label>
                    <select
                      value={selectedId}
                      onChange={e => handleWeaponChange(idx, e.target.value)}
                      disabled={!cat}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-slate-200 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                    >
                      <option value="">— Select Weapon —</option>
                      {weaponsInCat.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedWeapon && (
                  <div className="mt-2 text-xs text-slate-400 flex gap-4">
                    <span>Damage: <span className="text-slate-200">{selectedWeapon.damage}</span></span>
                    <span>Range: <span className="text-slate-200">{selectedWeapon.range.charAt(0).toUpperCase() + selectedWeapon.range.slice(1)}</span></span>
                    {selectedWeapon.notes && (
                      <span className={selectedWeapon.notes === 'See Weapon Notes' ? 'italic text-amber-400' : ''}>
                        {selectedWeapon.notes}
                      </span>
                    )}
                    {selectedWeapon.twoHanded && <span className="text-amber-300">Two-handed</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Armor Selection */}
      {armorChoice && (
        <div className="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-200 mb-3">Choose Your Armor</h3>
          <div className="space-y-2">
            {armorChoice.allowedCategories.map(cat => {
              if (cat === 'none') {
                return (
                  <label key={cat} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-slate-700">
                    <input
                      type="radio"
                      name="armor-category"
                      checked={selectedArmorCategory === 'none'}
                      onChange={() => selectArmorCategory('none')}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-slate-200">No Armor</span>
                      <span className="text-xs text-slate-400 ml-2">(0 Armor, no Speed Effort penalty)</span>
                    </div>
                  </label>
                );
              }
              const stats = ARMOR_STATS[cat];
              const effectivePenalty = type.trainedInArmor
                ? Math.max(0, stats.speedEffortPenalty - 1)
                : stats.speedEffortPenalty;
              return (
                <label key={cat} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-slate-700">
                  <input
                    type="radio"
                    name="armor-category"
                    checked={selectedArmorCategory === cat}
                    onChange={() => selectArmorCategory(cat as ArmorCategory)}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-slate-200">{cat.charAt(0).toUpperCase() + cat.slice(1)} Armor</span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({stats.armorPoints} Armor, +{effectivePenalty} Speed Effort cost per level)
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          {type.trainedInArmor && (
            <p className="mt-3 text-xs text-emerald-400">
              Your "Trained in Armor" ability reduces Speed Effort cost by 1.
            </p>
          )}
        </div>
      )}

      {/* Equipment Preview */}
      {equipment && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-200 mb-3">Equipment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-slate-400 font-medium mb-1">Weapons</h4>
              {equipment.weapons.length > 0
                ? equipment.weapons.map((w, i) => <p key={i} className="text-slate-300">- {w.name} ({w.damage} dmg, {w.range})</p>)
                : <p className="text-slate-500 italic">None selected</p>
              }
            </div>
            <div>
              <h4 className="text-slate-400 font-medium mb-1">Armor</h4>
              <p className="text-slate-300">{equipment.armor.name} ({equipment.armor.armorPoints} pts)</p>
            </div>
            <div>
              <h4 className="text-slate-400 font-medium mb-1">General</h4>
              {equipment.equipment.map((e, i) => <p key={i} className="text-slate-300">- {e}</p>)}
            </div>
            <div>
              <h4 className="text-slate-400 font-medium mb-1">Shins</h4>
              <p className="text-slate-300">{equipment.shins}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
