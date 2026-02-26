import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot, DocumentReference } from 'firebase/firestore';
import { db } from '@/services/firebase';

const MAINTENANCE_REF = { collection: 'config', id: 'maintenance' } as const;

interface MaintenanceState {
  isActive: boolean;
  message: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  activatedAt: string | null;
  load: () => Promise<void>;
  /** Subscribe to real-time maintenance updates from Firestore. Returns unsubscribe. */
  subscribe: () => () => void;
  activate: (message: string, scheduledEnd?: string) => Promise<void>;
  deactivate: () => Promise<void>;
  updateMessage: (message: string) => Promise<void>;
}

function applyMaintenanceData(data: any, set: (s: Partial<MaintenanceState>) => void, ref: DocumentReference) {
  if (!data) {
    set({
      isActive: false,
      message: 'We are currently performing scheduled maintenance. The app will be back shortly.',
      scheduledStart: null,
      scheduledEnd: null,
      activatedAt: null,
    });
    return;
  }
  if (data.scheduledEnd) {
    const endTime = new Date(data.scheduledEnd).getTime();
    if (endTime < Date.now()) {
      const cleared = {
        isActive: false,
        message: '',
        scheduledStart: null,
        scheduledEnd: null,
        activatedAt: null,
      };
      setDoc(ref, cleared, { merge: false }).catch(() => {});
      set(cleared);
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

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  isActive: false,
  message: 'We are currently performing scheduled maintenance. The app will be back shortly.',
  scheduledStart: null,
  scheduledEnd: null,
  activatedAt: null,

  load: async () => {
    try {
      const ref = doc(db, MAINTENANCE_REF.collection, MAINTENANCE_REF.id);
      const snap = await getDoc(ref);
      applyMaintenanceData(snap.exists() ? snap.data() : null, set, ref);
    } catch (e) {
      console.error('Failed to load maintenance state', e);
    }
  },

  subscribe: () => {
    const ref = doc(db, MAINTENANCE_REF.collection, MAINTENANCE_REF.id);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        applyMaintenanceData(snap.exists() ? snap.data() : null, set, ref);
      },
      (err) => {
        console.error('Maintenance snapshot error', err);
      }
    );
    return unsubscribe;
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
    const ref = doc(db, 'config', 'maintenance');
    await setDoc(ref, state, { merge: false });
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
    const ref = doc(db, 'config', 'maintenance');
    await setDoc(ref, state, { merge: false });
    set(state);
  },

  updateMessage: async (message: string) => {
    const current = get();
    const state = { ...current, message };
    const ref = doc(db, 'config', 'maintenance');
    await setDoc(ref, {
      isActive: state.isActive,
      message: state.message,
      scheduledStart: state.scheduledStart,
      scheduledEnd: state.scheduledEnd,
      activatedAt: state.activatedAt,
    }, { merge: false });
    set({ message });
  },
}));
