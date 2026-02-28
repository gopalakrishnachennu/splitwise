import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  variant: 'info',
  show: (message, variant = 'info') =>
    set({ visible: true, message, variant }),
  hide: () => set({ visible: false, message: '' }),
}));

