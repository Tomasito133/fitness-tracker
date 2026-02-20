import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Active workout state
  activeWorkoutId: number | null;
  setActiveWorkoutId: (id: number | null) => void;
  
  // Rest timer
  restTimerSeconds: number;
  defaultRestSeconds: number;
  setDefaultRestSeconds: (seconds: number) => void;
  
  // User preferences
  userWeight: number | null;
  setUserWeight: (weight: number | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      activeWorkoutId: null,
      setActiveWorkoutId: (id) => set({ activeWorkoutId: id }),
      
      restTimerSeconds: 90,
      defaultRestSeconds: 90,
      setDefaultRestSeconds: (seconds) => set({ defaultRestSeconds: seconds, restTimerSeconds: seconds }),
      
      userWeight: null,
      setUserWeight: (weight) => set({ userWeight: weight }),
    }),
    {
      name: 'fitness-app-storage',
    }
  )
);
