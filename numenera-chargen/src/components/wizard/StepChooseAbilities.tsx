import { useCharacterStore } from '../../store/useCharacterStore';
import { getTypeById, getFocusById } from '../../data';

export default function StepChooseAbilities() {
  const { typeId, focusId, chosenAbilityIds, toggleAbility } = useCharacterStore();

  const type = typeId ? getTypeById(typeId) : undefined;
  const focus = focusId ? getFocusById(focusId) : undefined;

  if (!type) return <p className="text-slate-400">Please select a Type first.</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 5: Choose Abilities</h2>

      {type.abilityChoices.map(choice => {
        const selectedCount = choice.options.filter(o => chosenAbilityIds.includes(o.id)).length;
        const atMax = selectedCount >= choice.pickCount;

        return (
          <div key={choice.label} className="mb-8">
            <h3 className="text-lg font-semibold text-slate-200 mb-1">
              {choice.label}
              <span className="text-sm text-slate-400 ml-2">
                (Choose {choice.pickCount} — {selectedCount} selected)
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {choice.options.map(ability => {
                const isSelected = chosenAbilityIds.includes(ability.id);
                const disabled = !isSelected && atMax;

                return (
                  <button
                    key={ability.id}
                    onClick={() => !disabled && toggleAbility(ability.id)}
                    disabled={disabled}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-900/30'
                        : disabled
                          ? 'border-slate-700 bg-slate-800 opacity-40 cursor-not-allowed'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm">{ability.name}</h4>
                      <div className="flex gap-2 text-xs">
                        {ability.cost && (
                          <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                            {ability.cost.amount} {ability.cost.pool}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 capitalize">
                          {ability.type}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ability.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {focus?.tier1.abilityChoice && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-emerald-300 mb-1">
            Focus Ability: Choose {focus.tier1.abilityChoice.pickCount}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {focus.tier1.abilityChoice.options.map(ability => {
              const isSelected = chosenAbilityIds.includes(ability.id);
              return (
                <button
                  key={ability.id}
                  onClick={() => toggleAbility(ability.id)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-900/30'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                  }`}
                >
                  <h4 className="font-bold text-sm mb-1">{ability.name}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{ability.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
