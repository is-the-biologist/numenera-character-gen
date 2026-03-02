import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character } from '../types/Character';
import { assembleCharacter } from '../engine/characterAssembler';
import { validateCharacter } from '../engine/validationEngine';

interface CharacterStore {
  // Current step (0-indexed)
  currentStep: number;
  setStep: (step: number) => void;

  // Selections
  typeId: string | null;
  descriptorId: string | null;
  focusId: string | null;
  bonusAllocation: { might: number; speed: number; intellect: number };
  jackFlexEdge: 'might' | 'speed' | 'intellect' | null;
  chosenAbilityIds: string[];
  chosenSkills: string[];
  backgroundName: string;
  initialLink: string;
  connection: string;
  characterName: string;
  notes: string;

  // Actions
  selectType: (id: string) => void;
  selectDescriptor: (id: string) => void;
  selectFocus: (id: string) => void;
  setBonusAllocation: (allocation: { might: number; speed: number; intellect: number }) => void;
  setJackFlexEdge: (stat: 'might' | 'speed' | 'intellect') => void;
  toggleAbility: (id: string) => void;
  setChosenSkills: (skills: string[]) => void;
  setBackground: (name: string) => void;
  setInitialLink: (link: string) => void;
  setConnection: (connection: string) => void;
  setCharacterName: (name: string) => void;
  setNotes: (notes: string) => void;

  // Computed
  getAssembledCharacter: () => Character | null;
  getValidationErrors: () => string[];

  // Reset
  resetAll: () => void;
}

const initialState = {
  currentStep: 0,
  typeId: null as string | null,
  descriptorId: null as string | null,
  focusId: null as string | null,
  bonusAllocation: { might: 0, speed: 0, intellect: 0 },
  jackFlexEdge: null as 'might' | 'speed' | 'intellect' | null,
  chosenAbilityIds: [] as string[],
  chosenSkills: [] as string[],
  backgroundName: '',
  initialLink: '',
  connection: '',
  characterName: '',
  notes: '',
};

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      // Cascading reset: selectType resets downstream choices
      selectType: (id) =>
        set({
          typeId: id,
          chosenAbilityIds: [],
          chosenSkills: [],
          bonusAllocation: { might: 0, speed: 0, intellect: 0 },
          jackFlexEdge: null,
          backgroundName: '',
        }),

      selectDescriptor: (id) => set({ descriptorId: id }),

      selectFocus: (id) => set({ focusId: id }),

      setBonusAllocation: (allocation) => set({ bonusAllocation: allocation }),

      setJackFlexEdge: (stat) => set({ jackFlexEdge: stat }),

      toggleAbility: (id) =>
        set((state) => {
          const ids = state.chosenAbilityIds;
          if (ids.includes(id)) {
            return { chosenAbilityIds: ids.filter((a) => a !== id) };
          }
          return { chosenAbilityIds: [...ids, id] };
        }),

      setChosenSkills: (skills) => set({ chosenSkills: skills }),

      setBackground: (name) => set({ backgroundName: name }),

      setInitialLink: (link) => set({ initialLink: link }),

      setConnection: (connection) => set({ connection: connection }),

      setCharacterName: (name) => set({ characterName: name }),

      setNotes: (notes) => set({ notes: notes }),

      getAssembledCharacter: () => {
        const state = get();
        if (!state.typeId || !state.descriptorId || !state.focusId) return null;

        const validation = validateCharacter({
          typeId: state.typeId,
          descriptorId: state.descriptorId,
          focusId: state.focusId,
          bonusAllocation: state.bonusAllocation,
          jackFlexEdge: state.jackFlexEdge,
          chosenAbilityIds: state.chosenAbilityIds,
          chosenSkills: state.chosenSkills,
          characterName: state.characterName,
        });

        if (!validation.valid) return null;

        return assembleCharacter({
          typeId: state.typeId,
          descriptorId: state.descriptorId,
          focusId: state.focusId,
          bonusAllocation: state.bonusAllocation,
          jackFlexEdge: state.jackFlexEdge,
          chosenAbilityIds: state.chosenAbilityIds,
          chosenSkills: state.chosenSkills,
          backgroundName: state.backgroundName,
          initialLink: state.initialLink,
          characterName: state.characterName,
          notes: state.notes,
        });
      },

      getValidationErrors: () => {
        const state = get();
        const result = validateCharacter({
          typeId: state.typeId,
          descriptorId: state.descriptorId,
          focusId: state.focusId,
          bonusAllocation: state.bonusAllocation,
          jackFlexEdge: state.jackFlexEdge,
          chosenAbilityIds: state.chosenAbilityIds,
          chosenSkills: state.chosenSkills,
          characterName: state.characterName,
        });
        return result.errors;
      },

      resetAll: () => set(initialState),
    }),
    {
      name: 'numenera-chargen-state',
    }
  )
);
