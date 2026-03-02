import { useCharacterStore } from '../../store/useCharacterStore';
import { getTypeById, getDescriptorById } from '../../data';

const STATS = ['might', 'speed', 'intellect'] as const;

export default function StepAllocatePools() {
  const { typeId, descriptorId, bonusAllocation, setBonusAllocation, jackFlexEdge, setJackFlexEdge } = useCharacterStore();

  const type = typeId ? getTypeById(typeId) : undefined;
  const descriptor = descriptorId ? getDescriptorById(descriptorId) : undefined;

  if (!type) return <p className="text-slate-400">Please select a Type first.</p>;

  const totalAllocated = bonusAllocation.might + bonusAllocation.speed + bonusAllocation.intellect;
  const remaining = type.bonusPoolPoints - totalAllocated;

  const adjust = (stat: typeof STATS[number], delta: number) => {
    const newVal = bonusAllocation[stat] + delta;
    if (newVal < 0) return;
    const newTotal = totalAllocated + delta;
    if (newTotal > type.bonusPoolPoints) return;
    setBonusAllocation({ ...bonusAllocation, [stat]: newVal });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Step 4: Allocate Bonus Pool Points</h2>
      <p className="text-slate-400 mb-6">
        Distribute {type.bonusPoolPoints} bonus points across your stat pools.
      </p>

      <div className="text-center mb-6">
        <span className={`text-2xl font-bold ${remaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          Points remaining: {remaining} of {type.bonusPoolPoints}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {STATS.map(stat => {
          const base = type.basePools[stat];
          const mod = descriptor?.poolModifiers[stat] ?? 0;
          const alloc = bonusAllocation[stat];
          const total = base + mod + alloc;

          return (
            <div key={stat} className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold capitalize mb-2 text-slate-200">{stat}</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-2">{total}</p>
              <p className="text-xs text-slate-500 mb-3">
                {base} base {mod !== 0 ? `${mod > 0 ? '+' : ''}${mod} descriptor` : ''} +{alloc} allocated
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => adjust(stat, -1)}
                  disabled={alloc === 0}
                  className="w-8 h-8 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                >
                  -
                </button>
                <span className="text-lg font-mono w-8 text-center">{alloc}</span>
                <button
                  onClick={() => adjust(stat, 1)}
                  disabled={remaining === 0}
                  className="w-8 h-8 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {type.flexEdge && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-bold text-amber-400 mb-2">Flex Edge: Allocate 1 Edge point</h3>
          <p className="text-sm text-slate-400 mb-3">As a Jack, you get 1 additional Edge point to assign to any stat.</p>
          <div className="flex gap-4">
            {STATS.map(stat => (
              <label key={stat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="flexEdge"
                  checked={jackFlexEdge === stat}
                  onChange={() => setJackFlexEdge(stat)}
                  className="accent-amber-500"
                />
                <span className="capitalize text-slate-300">{stat}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
