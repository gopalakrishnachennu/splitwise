import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import {
  Platform, useWindowDimensions,
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMaintenanceStore } from '@/stores/useMaintenanceStore';
import { useThemeColors } from '@/utils/hooks';

function MaintenanceScreen() {
  const maintenance = useMaintenanceStore();

  const formatTimeRemaining = (): string | null => {
    if (!maintenance.scheduledEnd) return null;
    const end = new Date(maintenance.scheduledEnd).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `Estimated time: ${hours}h ${mins}m`;
    return `Estimated time: ${mins} minutes`;
  };

  const timeRemaining = formatTimeRemaining();

  return (
    <View style={maintStyles.container}>
      <View style={maintStyles.iconWrap}>
        <MaterialIcons name="build-circle" size={64} color="#FDCB6E" />
      </View>
      <Text style={maintStyles.title}>Under Maintenance</Text>
      <Text style={maintStyles.message}>{maintenance.message}</Text>
      {timeRemaining && (
        <View style={maintStyles.timeBadge}>
          <MaterialIcons name="schedule" size={16} color="#FDCB6E" />
          <Text style={maintStyles.timeText}>{timeRemaining}</Text>
        </View>
      )}
      <ActivityIndicator size="small" color="#5BC5A7" style={{ marginTop: 30 }} />
      <Text style={maintStyles.waitText}>Checking status...</Text>
    </View>
  );
}

const maintStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    color: '#8892b0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(253, 203, 110, 0.2)',
  },
  timeText: {
    color: '#FDCB6E',
    fontSize: 14,
    fontWeight: '600',
  },
  waitText: {
    color: '#555',
    fontSize: 12,
    marginTop: 8,
  },
});

export default function TabLayout() {
  const theme = useThemeColors();
  const { isAuthenticated, isLoading } = useAuthStore();
  const maintenance = useMaintenanceStore();
  const { width } = useWindowDimensions();
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

  useEffect(() => {
    maintenance.load().then(() => setMaintenanceLoaded(true));

    const interval = setInterval(() => {
      maintenance.load();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !maintenanceLoaded) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  if (maintenance.isActive) {
    return <MaintenanceScreen />;
  }

  const isTablet = width >= 768;

  const tabBarHeight = Platform.select({
    ios: 88,
    android: 64,
    web: 60,
    default: 64,
  });

  const tabBarPaddingBottom = Platform.select({
    ios: 28,
    android: 8,
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
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
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
