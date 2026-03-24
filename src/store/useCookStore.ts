import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ActiveTimer } from '@/types/timer';

interface CookState {
  currentStepIndex: number;
  activeTimers: ActiveTimer[];

  // Actions
  setCurrentStepIndex: (index: number | ((prev: number) => number)) => void;
  setActiveTimers: (timers: ActiveTimer[] | ((prev: ActiveTimer[]) => ActiveTimer[])) => void;
  resetCookState: () => void;
}

export const useCookStore = create<CookState>()(
  devtools(
    (set) => ({
      currentStepIndex: 0,
      activeTimers: [],

      setCurrentStepIndex: (index) =>
        set((state) => ({
          currentStepIndex: typeof index === 'function' ? index(state.currentStepIndex) : index,
        })),

      setActiveTimers: (timers) =>
        set((state) => ({
          activeTimers: typeof timers === 'function' ? timers(state.activeTimers) : timers,
        })),

      resetCookState: () => set({ currentStepIndex: 0, activeTimers: [] }),
    }),
    { name: 'useCookStore' },
  ),
);
