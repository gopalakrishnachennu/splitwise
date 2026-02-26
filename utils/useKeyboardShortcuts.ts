import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Registers global keyboard shortcuts for the web app.
 * Only active when user is in the main (tabs) app. Does not fire when focus is in an input/textarea.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.getAttribute('contenteditable') === 'true';
      if (isInput) return;

      const meta = e.metaKey || e.ctrlKey;
      if (!meta && e.key !== 'Escape') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        router.back();
        return;
      }

      if (!meta) return;

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          router.push('/search');
          break;
        case 'n':
          e.preventDefault();
          router.push('/expense/add');
          break;
        case '1':
          e.preventDefault();
          router.replace('/(tabs)');
          break;
        case '2':
          e.preventDefault();
          router.replace('/(tabs)/groups');
          break;
        case '3':
          e.preventDefault();
          router.replace('/(tabs)/activity');
          break;
        case '4':
          e.preventDefault();
          router.replace('/(tabs)/account');
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);
}
