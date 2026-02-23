import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useThemeColors } from '@/utils/hooks';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  style?: any;
}

const AVATAR_COLORS = [
  '#E17055', '#00B894', '#0984E3', '#6C5CE7',
  '#E84393', '#FDCB6E', '#00CEC9', '#A29BFE',
  '#FF7675', '#55EFC4', '#74B9FF', '#FD79A8',
];

const getColorFromName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 40, style }) => {
  const colors = useThemeColors();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  const bgColor = getColorFromName(name);
  const fontSize = size * 0.38;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: '#FFF', fontSize, fontWeight: '600' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
};
