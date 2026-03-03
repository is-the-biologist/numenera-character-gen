import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { allFoci } from '../../data';

export default function StepFocus() {
  const { focusId, selectFocus } = useCharacterStore();
  const [search, setSearch] = useState('');

  const filtered = allFoci.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = allFoci.find(f => f.id === focusId);

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 3: Choose Your Focus</h2>
      <p className="text-slate-400 mb-4">Your Focus completes your character sentence and grants unique abilities.</p>

      <input
        type="text"
        placeholder="Search foci..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {filtered.map(f => (
          <button
            key={f.id}
            onClick={() => selectFocus(f.id)}
            className={`text-left p-3 rounded-lg border transition-all text-sm ${
              focusId === f.id
                ? 'border-emerald-500 bg-emerald-900/20'
                : 'border-slate-700 bg-slate-800 hover:border-slate-500'
            }`}
          >
            <h3 className="font-bold mb-1">{f.name}</h3>
            {f.tier1.grantedAbilities.length > 0 && (
              <p className="text-xs text-emerald-400">
                {f.tier1.grantedAbilities.map(a => a.name).join(', ')}
              </p>
            )}
            {f.tier1.trainedSkills.length > 0 && (
              <p className="text-xs text-slate-400">
                Skills: {f.tier1.trainedSkills.join(', ')}
              </p>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-emerald-300 mb-2">{selected.name}</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{selected.description}</p>

          {/* Tier 1 Details */}
          {selected.tier1.grantedAbilities.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">Tier 1</h4>
              {selected.tier1.grantedAbilities.map(a => (
                <div key={a.id} className="mb-3 ml-2">
                  <h5 className="text-sm font-semibold text-emerald-400">
                    {a.name}
                    {a.cost && (
                      <span className="text-slate-400 font-normal">
                        {' '}({a.cost.amount} {a.cost.pool.charAt(0).toUpperCase() + a.cost.pool.slice(1)})
                      </span>
                    )}
                  </h5>
                  <p className="text-sm text-slate-300">{a.description}</p>
                </div>
              ))}
            </div>
          )}

          {selected.tier1.trainedSkills.length > 0 && (
            <p className="text-sm text-slate-400 mb-2">
              Trained Skills: {selected.tier1.trainedSkills.join(', ')}
            </p>
          )}

          {selected.tier1.additionalEquipment.length > 0 && (
            <p className="text-sm text-slate-400 mb-2">
              Equipment: {selected.tier1.additionalEquipment.join(', ')}
            </p>
          )}

          {/* Higher Tier Summary */}
          {selected.higherTiers.length > 0 && (
            <div className="mt-4 border-t border-slate-700 pt-4">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">Higher Tier Abilities</h4>
              {selected.higherTiers.map(ht => (
                <div key={ht.tier} className="mb-2 ml-2">
                  <span className="text-xs font-semibold text-slate-500">Tier {ht.tier}:</span>{' '}
                  {ht.abilities.map((a, i) => (
                    <span key={a.id} className="text-sm text-slate-300">
                      <span className="text-emerald-400">{a.name}</span>
                      {a.cost && (
                        <span className="text-slate-500">
                          {' '}({a.cost.amount} {a.cost.pool.charAt(0).toUpperCase() + a.cost.pool.slice(1)})
                        </span>
                      )}
                      {i < ht.abilities.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {selected.connection && (
            <p className="text-sm text-slate-400 italic mt-4">
              Connection: {selected.connection}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
