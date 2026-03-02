import { useCharacterStore } from '../../store/useCharacterStore';
import { getTypeById, getDescriptorById, getFocusById } from '../../data';
import { resolveSkills } from '../../engine/skillResolver';
import { resolveEquipment } from '../../engine/equipmentResolver';

export default function StepSkillsAndEquipment() {
  const store = useCharacterStore();
  const { typeId, descriptorId, focusId, chosenSkills, setChosenSkills } = store;

  const type = typeId ? getTypeById(typeId) : undefined;
  const descriptor = descriptorId ? getDescriptorById(descriptorId) : undefined;
  const focus = focusId ? getFocusById(focusId) : undefined;

  if (!type) return <p className="text-slate-400">Please select a Type first.</p>;

  // Handle skill choice selection
  const handleSkillSelect = (choiceIndex: number, value: string) => {
    const newSkills = [...chosenSkills];
    newSkills[choiceIndex] = value;
    setChosenSkills(newSkills);
  };

  // Compute skill resolution preview
  const skills = resolveSkills({
    typeAutoSkills: type.automaticSkills,
    typeChosenSkills: chosenSkills.filter(Boolean),
    descriptorSkills: descriptor?.trainedSkills ?? [],
    focusSkills: focus?.tier1.trainedSkills ?? [],
    typeInabilities: type.inabilities,
    descriptorInabilities: descriptor?.inabilities ?? [],
  });

  // Compute equipment
  const equipment = type && descriptor && focus
    ? resolveEquipment(type, descriptor, focus)
    : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 6: Skills & Equipment</h2>

      {/* Skill Choices */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Skill Choices</h3>
        {type.skillChoices.map((choice, idx) => (
          <div key={idx} className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {choice.label} (Choose {choice.pickCount})
            </label>
            {choice.freeform ? (
              <input
                type="text"
                value={chosenSkills[idx] ?? ''}
                onChange={e => handleSkillSelect(idx, e.target.value)}
                placeholder="Enter a skill name..."
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            ) : (
              <select
                value={chosenSkills[idx] ?? ''}
                onChange={e => handleSkillSelect(idx, e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">— Select —</option>
                {choice.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

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

      {/* Equipment */}
      {equipment && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-200 mb-3">Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-slate-400 font-medium mb-1">Weapons</h4>
              {equipment.weapons.map((w, i) => <p key={i} className="text-slate-300">- {w}</p>)}
            </div>
            <div>
              <h4 className="text-slate-400 font-medium mb-1">Armor</h4>
              <p className="text-slate-300">{equipment.armor}</p>
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
