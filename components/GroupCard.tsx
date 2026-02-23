import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Group } from '@/types';
import { useThemeColors } from '@/utils/hooks';
import { Avatar } from './Avatar';

interface GroupCardProps {
  group: Group;
  balance?: number;
  onPress?: () => void;
}

const GROUP_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  home: { icon: 'home', color: '#E84393' },
  trip: { icon: 'flight', color: '#0984E3' },
  couple: { icon: 'favorite', color: '#E17055' },
  other: { icon: 'group', color: '#6C5CE7' },
};

export const GroupCard: React.FC<GroupCardProps> = ({ group, balance = 0, onPress }) => {
  const colors = useThemeColors();
  const typeInfo = GROUP_TYPE_ICONS[group.type] || GROUP_TYPE_ICONS.other;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      activeOpacity={0.7}
    >
      <View style={[styles.groupIcon, { backgroundColor: typeInfo.color + '20' }]}>
        <MaterialIcons name={typeInfo.icon as any} size={24} color={typeInfo.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={styles.membersRow}>
          {group.members.slice(0, 4).map((member, index) => (
            <Avatar
              key={member.id}
              name={member.name}
              size={20}
              style={index > 0 ? { marginLeft: -6 } : undefined}
            />
          ))}
          {group.members.length > 4 && (
            <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
              +{group.members.length - 4}
            </Text>
          )}
        </View>
      </View>

      {balance !== 0 && (
        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, { color: balance > 0 ? colors.positive : colors.negative }]}>
            {balance > 0 ? 'you are owed' : 'you owe'}
          </Text>
          <Text style={[styles.balance, { color: balance > 0 ? colors.positive : colors.negative }]}>
            ${Math.abs(balance).toFixed(2)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  memberCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  balanceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  balance: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 1,
  },
});
