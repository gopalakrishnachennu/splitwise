import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  /** Light tap - tab switches, toggles, selections, chip presses */
  light() {
    if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /** Medium tap - button presses, card taps, navigation actions */
  medium() {
    if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /** Heavy tap - important confirmations, pull-to-refresh trigger */
  heavy() {
    if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /** Success - expense created, group created, settled up, login success */
  success() {
    if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /** Warning - destructive action confirm dialogs (delete, remove, logout) */
  warning() {
    if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /** Error - validation failures, login errors */
  error() {
    if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /** Selection tick - toggling checkboxes, radio buttons, split type changes */
  selection() {
    if (isNative) Haptics.selectionAsync();
  },
};
