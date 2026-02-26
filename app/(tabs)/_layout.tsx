import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMaintenanceStore } from '@/stores/useMaintenanceStore';
import { useThemeColors } from '@/utils/hooks';
import { useKeyboardShortcuts } from '@/utils/useKeyboardShortcuts';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';

export default function TabLayout() {
  useKeyboardShortcuts();
  const theme = useThemeColors();
  const { isAuthenticated, isLoading, needsEmailVerification, user } = useAuthStore();
  const maintenance = useMaintenanceStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    maintenance.load().then(() => {
      if (!cancelled) setMaintenanceLoaded(true);
    });
    const unsubscribe = maintenance.subscribe();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (isLoading || !maintenanceLoaded) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (needsEmailVerification) return <Redirect href="/(auth)/verify-email" />;

  // Show maintenance screen for regular users only; admins can still use the app while it's active.
  if (maintenance.isActive && ((user?.role ?? 'user') !== 'admin')) {
    return <MaintenanceScreen />;
  }

  const isTablet = width >= 768;

  const tabBarBaseHeight = 56;

  const tabBarHeight = Platform.select({
    ios: tabBarBaseHeight + insets.bottom,
    android: tabBarBaseHeight + insets.bottom,
    web: 60,
    default: 64,
  });

  const tabBarPaddingBottom = Platform.select({
    ios: insets.bottom || 16,
    android: insets.bottom || 12,
    web: 8,
    default: 8,
  });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
        ...(Platform.OS === 'web' && isTablet ? {
          headerTitleAlign: 'center' as const,
        } : {}),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Friends',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
