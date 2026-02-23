import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  loaded: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  load: () => Promise<void>;
}

const STORAGE_KEY = 'splitwise_theme';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  loaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ mode: saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setMode: async (mode: ThemeMode) => {
    await AsyncStorage.setItem(STORAGE_KEY, mode);
    set({ mode });
  },
}));
