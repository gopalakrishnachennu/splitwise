import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/utils/hooks';

export function NetworkBanner() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useState(new Animated.Value(-60))[0];

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      if (offline) {
        setVisible(true);
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      } else if (visible) {
        Animated.timing(translateY, {
          toValue: -60,
          duration: 200,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setVisible(false);
        });
      }
    });

    return () => sub();
  }, [translateY, visible]);

  if (!visible) return null;

  const topOffset = Platform.OS === 'web' ? 0 : insets.top;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.error ?? '#D32F2F',
          paddingTop: topOffset + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.dot} />
        <Text style={styles.text}>You&apos;re offline. Please check your internet connection.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFC107',
  },
  text: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
});

