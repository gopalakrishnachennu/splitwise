import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColors } from '@/utils/hooks';
import { useMaintenanceStore } from '@/stores/useMaintenanceStore';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';

export default function AuthLayout() {
  const theme = useThemeColors();
  const maintenance = useMaintenanceStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    maintenance.load().finally(() => setReady(true));
    const unsub = maintenance.subscribe();
    return unsub;
  }, []);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (maintenance.isActive) {
    return <MaintenanceScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
