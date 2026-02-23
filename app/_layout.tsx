import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useThemeColors, useResolvedColorScheme } from '@/utils/hooks';

export default function RootLayout() {
  const theme = useThemeColors();
  const colorScheme = useResolvedColorScheme();
  const { loadUser } = useAuthStore();
  const loadTheme = useThemeStore((s) => s.load);
  const themeLoaded = useThemeStore((s) => s.loaded);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUser(), loadTheme()]);
      setAppReady(true);
    };
    init();
  }, []);

  if (!appReady || !themeLoaded) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.primary }]}>  
        <Text style={styles.splashTitle}>Splitwise</Text>
        <ActivityIndicator size="large" color="#FFF" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/[id]" options={{ title: 'Group', headerBackTitle: 'Back' }} />
        <Stack.Screen name="expense/add" options={{ title: 'Add Expense', presentation: 'modal' }} />
        <Stack.Screen name="expense/[id]" options={{ title: 'Expense Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="friend/[id]" options={{ title: 'Friend', headerBackTitle: 'Back' }} />
        <Stack.Screen name="group/create" options={{ title: 'Create Group', presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ title: 'Search', headerBackTitle: 'Back' }} />
        <Stack.Screen name="settle-up" options={{ title: 'Settle Up', presentation: 'modal' }} />
        <Stack.Screen name="charts" options={{ title: 'Charts & Reports', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
});
