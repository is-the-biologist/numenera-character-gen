import { useCharacterStore } from '../../store/useCharacterStore';
import { calculatePools } from '../../engine/poolCalculator';
import { getTypeById, getDescriptorById, getFocusById } from '../../data';
import StepType from './StepType';
import StepDescriptor from './StepDescriptor';
import StepFocus from './StepFocus';
import StepAllocatePools from './StepAllocatePools';
import StepChooseAbilities from './StepChooseAbilities';
import StepSkillsAndEquipment from './StepSkillsAndEquipment';
import StepReview from './StepReview';

const STEPS = [
  { label: 'Type', component: StepType },
  { label: 'Descriptor', component: StepDescriptor },
  { label: 'Focus', component: StepFocus },
  { label: 'Allocate Pools', component: StepAllocatePools },
  { label: 'Abilities', component: StepChooseAbilities },
  { label: 'Skills & Equipment', component: StepSkillsAndEquipment },
  { label: 'Review', component: StepReview },
];

const EMPTY_DESCRIPTOR = {
  id: '', name: '', source: 'discovery' as const, description: '',
  poolModifiers: {}, trainedSkills: [] as string[], inabilities: [] as string[],
  specialAbilities: [] as { name: string; description: string }[],
  additionalEquipment: [] as string[], initialLinks: [] as string[],
};

function canProceed(step: number, state: ReturnType<typeof useCharacterStore.getState>): boolean {
  switch (step) {
    case 0: return !!state.typeId;
    case 1: return !!state.descriptorId;
    case 2: return !!state.focusId;
    case 3: {
      const type = state.typeId ? getTypeById(state.typeId) : undefined;
      if (!type) return false;
      const { might, speed, intellect } = state.bonusAllocation;
      if (might + speed + intellect !== type.bonusPoolPoints) return false;
      if (type.flexEdge && !state.jackFlexEdge) return false;
      return true;
    }
    case 4: {
      const type = state.typeId ? getTypeById(state.typeId) : undefined;
      if (!type) return false;
      const required = type.abilityChoices.reduce((sum, c) => sum + c.pickCount, 0);
      return state.chosenAbilityIds.length === required;
    }
    case 5: {
      const type = state.typeId ? getTypeById(state.typeId) : undefined;
      if (!type) return false;
      const required = type.skillChoices.reduce((sum, c) => sum + c.pickCount, 0);
      return state.chosenSkills.length === required;
    }
    case 6: return true;
    default: return false;
  }
}

export default function WizardShell() {
  const store = useCharacterStore();
  const { currentStep, setStep, typeId, descriptorId, focusId } = store;

  const type = typeId ? getTypeById(typeId) : undefined;
  const descriptor = descriptorId ? getDescriptorById(descriptorId) : undefined;
  const focus = focusId ? getFocusById(focusId) : undefined;

  // Compute live stats
  let liveStats = null;
  if (type) {
    const poolResult = calculatePools({
      type,
      descriptor: descriptor ?? EMPTY_DESCRIPTOR,
      bonusAllocation: store.bonusAllocation,
      jackFlexEdge: store.jackFlexEdge,
    });
    liveStats = poolResult.pools;
  }

  const StepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-cyan-400 mb-1">Numenera Character Generator</h1>
        <p className="text-lg text-slate-300">
          I am a{' '}
          <span className={descriptor ? 'text-amber-400 font-semibold' : 'text-slate-600'}>
            {descriptor?.name ?? '...'}
          </span>{' '}
          <span className={type ? 'text-cyan-400 font-semibold' : 'text-slate-600'}>
            {type?.name ?? '...'}
          </span>{' '}
          who{' '}
          <span className={focus ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
            {focus?.name ?? '...'}
          </span>
          .
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col gap-4 shrink-0">
          <nav>
            <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Progress</h2>
            <ul className="space-y-1">
              {STEPS.map((s, i) => (
                <li key={i}>
                  <button
                    onClick={() => setStep(i)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                      i === currentStep
                        ? 'bg-cyan-900/40 text-cyan-300 font-medium'
                        : i < currentStep
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600'
                    }`}
                  >
                    <span className="mr-2">{i < currentStep ? '●' : i === currentStep ? '◉' : '○'}</span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {liveStats && (
            <div className="border-t border-slate-700 pt-4">
              <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Live Stats</h2>
              <div className="space-y-2 text-sm">
                {(['might', 'speed', 'intellect'] as const).map(stat => (
                  <div key={stat}>
                    <div className="flex justify-between">
                      <span className="text-slate-300 capitalize">{stat}</span>
                      <span className="text-cyan-400 font-mono">{liveStats[stat].pool}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 pl-3">
                      <span>Edge</span>
                      <span className="font-mono">{liveStats[stat].edge}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-slate-700">
                  <span className="text-slate-300">Effort</span>
                  <span className="text-cyan-400 font-mono">{type?.effort ?? '-'}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <StepComponent />
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-6 py-3 flex justify-between">
        <button
          onClick={() => setStep(currentStep - 1)}
          disabled={currentStep === 0}
          className="px-4 py-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        {currentStep < 6 ? (
          <button
            onClick={() => setStep(currentStep + 1)}
            disabled={!canProceed(currentStep, store)}
            className="px-4 py-2 rounded bg-cyan-700 text-white hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next Step →
          </button>
        ) : null}
      </footer>
    </div>
  );
}
