import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/utils/hooks';

export default function AuthLayout() {
  const theme = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
