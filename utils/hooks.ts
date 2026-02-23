import { useColorScheme, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Colors, ThemeColors } from '@/constants/Colors';
import { DeviceType, getDeviceType } from '@/utils/responsive';
import { useThemeStore } from '@/stores/useThemeStore';

export const useThemeColors = (): ThemeColors => {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.mode);

  let resolved: 'light' | 'dark';
  if (themeMode === 'system') {
    resolved = systemScheme === 'dark' ? 'dark' : 'light';
  } else {
    resolved = themeMode;
  }

  return Colors[resolved];
};

export const useResolvedColorScheme = (): 'light' | 'dark' => {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.mode);

  if (themeMode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return themeMode;
};

export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDeviceType(getDeviceType());
    });
    return () => subscription.remove();
  }, []);

  return deviceType;
};

export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  return dimensions;
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export const useRefresh = (fetchFn: () => Promise<void>) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFn();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFn]);

  return { refreshing, onRefresh };
};
