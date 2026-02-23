import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { useThemeColors } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', size = 'medium',
  loading, disabled, icon, style, textStyle, fullWidth,
}) => {
  const colors = useThemeColors();

  const getButtonStyles = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      gap: 8,
    };

    switch (size) {
      case 'small': Object.assign(base, { paddingHorizontal: 12, paddingVertical: 8 }); break;
      case 'large': Object.assign(base, { paddingHorizontal: 24, paddingVertical: 16 }); break;
      default: Object.assign(base, { paddingHorizontal: 20, paddingVertical: 12 }); break;
    }

    switch (variant) {
      case 'primary':
        Object.assign(base, { backgroundColor: colors.primary });
        break;
      case 'secondary':
        Object.assign(base, { backgroundColor: colors.surfaceVariant });
        break;
      case 'outline':
        Object.assign(base, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary });
        break;
      case 'ghost':
        Object.assign(base, { backgroundColor: 'transparent' });
        break;
      case 'danger':
        Object.assign(base, { backgroundColor: colors.error });
        break;
    }

    if (disabled || loading) base.opacity = 0.5;
    if (fullWidth) base.width = '100%';

    return base;
  };

  const getTextStyles = (): TextStyle => {
    const base: TextStyle = { fontWeight: '600' };

    switch (size) {
      case 'small': base.fontSize = 13; break;
      case 'large': base.fontSize = 17; break;
      default: base.fontSize = 15; break;
    }

    switch (variant) {
      case 'primary':
      case 'danger':
        base.color = '#FFFFFF';
        break;
      case 'secondary':
        base.color = colors.text;
        break;
      case 'outline':
      case 'ghost':
        base.color = colors.primary;
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      onPress={() => { haptic.light(); onPress(); }}
      disabled={disabled || loading}
      style={[getButtonStyles(), style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#FFF' : colors.primary} />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
