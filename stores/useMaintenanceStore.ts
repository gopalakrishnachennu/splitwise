import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'splitwise_maintenance';

interface MaintenanceState {
  isActive: boolean;
  message: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  activatedAt: string | null;
  load: () => Promise<void>;
  activate: (message: string, scheduledEnd?: string) => Promise<void>;
  deactivate: () => Promise<void>;
  updateMessage: (message: string) => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  isActive: false,
  message: 'We are currently performing scheduled maintenance. The app will be back shortly.',
  scheduledStart: null,
  scheduledEnd: null,
  activatedAt: null,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.scheduledEnd) {
          const endTime = new Date(data.scheduledEnd).getTime();
          if (endTime < Date.now()) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            set({ isActive: false, message: '', scheduledEnd: null, scheduledStart: null, activatedAt: null });
            return;
          }
        }
        set({
          isActive: data.isActive ?? false,
          message: data.message ?? '',
          scheduledStart: data.scheduledStart ?? null,
          scheduledEnd: data.scheduledEnd ?? null,
          activatedAt: data.activatedAt ?? null,
        });
      }
    } catch (e) {
      console.error('Failed to load maintenance state', e);
    }
  },

  activate: async (message: string, scheduledEnd?: string) => {
    const now = new Date().toISOString();
    const state = {
      isActive: true,
      message,
      scheduledStart: now,
      scheduledEnd: scheduledEnd || null,
      activatedAt: now,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    set(state);
  },

  deactivate: async () => {
    const state = {
      isActive: false,
      message: '',
      scheduledStart: null,
      scheduledEnd: null,
      activatedAt: null,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    set(state);
  },

  updateMessage: async (message: string) => {
    const current = get();
    const state = { ...current, message };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      isActive: state.isActive,
      message: state.message,
      scheduledStart: state.scheduledStart,
      scheduledEnd: state.scheduledEnd,
      activatedAt: state.activatedAt,
    }));
    set({ message });
  },
}));
