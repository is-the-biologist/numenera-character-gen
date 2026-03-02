import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { allDescriptors } from '../../data';
import type { Descriptor } from '../../types/Descriptor';

const GROUPS: { label: string; source: Descriptor['source'] }[] = [
  { label: 'Discovery', source: 'discovery' },
  { label: 'Destiny', source: 'destiny' },
  { label: 'Location-Based', source: 'location' },
  { label: 'Racial', source: 'racial' },
];

export default function StepDescriptor() {
  const { descriptorId, selectDescriptor } = useCharacterStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (source: string) =>
    setCollapsed(prev => ({ ...prev, [source]: !prev[source] }));

  const selected = allDescriptors.find(d => d.id === descriptorId);

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 2: Choose Your Descriptor</h2>
      <p className="text-slate-400 mb-6">Your Descriptor flavors your character with personality and additional skills.</p>

      {GROUPS.map(group => {
        const descriptors = allDescriptors.filter(d => d.source === group.source);
        if (descriptors.length === 0) return null;
        const isCollapsed = collapsed[group.source];

        return (
          <div key={group.source} className="mb-4">
            <button
              onClick={() => toggle(group.source)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200"
            >
              <span>{isCollapsed ? '▸' : '▾'}</span>
              {group.label} ({descriptors.length})
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {descriptors.map(d => (
                  <button
                    key={d.id}
                    onClick={() => selectDescriptor(d.id)}
                    className={`text-left p-3 rounded-lg border transition-all text-sm ${
                      descriptorId === d.id
                        ? 'border-amber-500 bg-amber-900/20'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <h3 className="font-bold mb-1">{d.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Object.entries(d.poolModifiers).map(([stat, val]) => (
                        val !== 0 && (
                          <span
                            key={stat}
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              (val as number) > 0 ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
                            }`}
                          >
                            {(val as number) > 0 ? '+' : ''}{val} {stat}
                          </span>
                        )
                      ))}
                    </div>
                    {d.trainedSkills.length > 0 && (
                      <p className="text-xs text-slate-400">Trained: {d.trainedSkills.join(', ')}</p>
                    )}
                    {d.inabilities.length > 0 && (
                      <p className="text-xs text-red-400">Inability: {d.inabilities.join(', ')}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {selected && (
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-amber-300 mb-2">{selected.name}</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{selected.description}</p>
          {selected.specialAbilities.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-400 mb-1">Special Abilities</h4>
              {selected.specialAbilities.map((a, i) => (
                <p key={i} className="text-sm text-slate-300"><strong>{a.name}:</strong> {a.description}</p>
              ))}
            </div>
          )}
          {selected.additionalEquipment.length > 0 && (
            <p className="text-sm text-slate-400">Additional Equipment: {selected.additionalEquipment.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
