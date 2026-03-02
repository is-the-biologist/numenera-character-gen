import { useCharacterStore } from '../../store/useCharacterStore';
import { allTypes } from '../../data';

export default function StepType() {
  const { typeId, selectType } = useCharacterStore();

  const selectedType = allTypes.find(t => t.id === typeId);

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 1: Choose Your Type</h2>
      <p className="text-slate-400 mb-6">Your Type is the core of your character — it determines your stat pools, abilities, and combat role.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {allTypes.map(t => (
          <button
            key={t.id}
            onClick={() => selectType(t.id)}
            className={`text-left p-4 rounded-lg border transition-all ${
              typeId === t.id
                ? 'border-cyan-500 bg-cyan-900/30 shadow-lg shadow-cyan-900/20'
                : 'border-slate-700 bg-slate-800 hover:border-slate-500'
            }`}
          >
            <h3 className="font-bold text-lg mb-1">{t.name}</h3>
            <div className="flex gap-3 text-xs text-slate-400">
              <span>M:{t.basePools.might}</span>
              <span>S:{t.basePools.speed}</span>
              <span>I:{t.basePools.intellect}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-cyan-300 mb-2">{selectedType.name}</h3>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">{selectedType.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-slate-400 mb-1">Base Pools</h4>
              <p className="text-slate-300">Might: {selectedType.basePools.might} | Speed: {selectedType.basePools.speed} | Intellect: {selectedType.basePools.intellect}</p>
              <p className="text-slate-400 text-xs mt-1">+{selectedType.bonusPoolPoints} bonus points to distribute</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-400 mb-1">Edge</h4>
              <p className="text-slate-300">M:{selectedType.baseEdge.might} S:{selectedType.baseEdge.speed} I:{selectedType.baseEdge.intellect}</p>
              {selectedType.flexEdge && <p className="text-amber-400 text-xs mt-1">+1 flex Edge (you choose)</p>}
            </div>
            <div>
              <h4 className="font-semibold text-slate-400 mb-1">Starting Equipment</h4>
              <ul className="text-slate-300 text-xs space-y-0.5">
                {selectedType.startingEquipment.map((e, i) => <li key={i}>- {e}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-400 mb-1">Abilities</h4>
              <ul className="text-slate-300 text-xs space-y-0.5">
                {selectedType.specialAbilities.map(a => <li key={a.id}>- {a.name}</li>)}
                {selectedType.abilityChoices.map(c => (
                  <li key={c.label} className="text-amber-400">Choose {c.pickCount} {c.label}</li>
                ))}
              </ul>
            </div>
          </div>

          {selectedType.backgrounds.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-slate-400 mb-1 text-sm">Backgrounds</h4>
              <div className="flex flex-wrap gap-2">
                {selectedType.backgrounds.map(b => (
                  <span key={b.name} className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">{b.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
