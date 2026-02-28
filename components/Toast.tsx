import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/utils/hooks';
import { useToastStore } from '@/stores/useToastStore';

export const Toast: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { visible, message, variant, hide } = useToastStore();
  const translateY = React.useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 80,
          duration: 180,
          useNativeDriver: true,
        }).start(() => hide());
      }, 2600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, hide, translateY]);

  if (!visible) return null;

  const bg =
    variant === 'success'
      ? colors.success ?? '#2E7D32'
      : variant === 'error'
      ? colors.error ?? '#D32F2F'
      : colors.surfaceVariant ?? '#424242';

  const iconName =
    variant === 'success' ? 'check-circle' : variant === 'error' ? 'error' : 'info';

  const bottomOffset = Platform.OS === 'web' ? 24 : insets.bottom + 12;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          transform: [{ translateY }],
          bottom: bottomOffset,
        },
      ]}
    >
      <MaterialIcons name={iconName as any} size={18} color="#FFF" />
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
    elevation: 20,
  },
  text: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
});

