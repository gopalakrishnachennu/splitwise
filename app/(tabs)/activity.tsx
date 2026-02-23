import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { formatCurrency } from '@/constants/Currencies';
import { Activity } from '@/types';
import { EmptyState } from '@/components/EmptyState';

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  expense_added: { icon: 'add-circle', color: '#0984E3' },
  expense_updated: { icon: 'edit', color: '#6C5CE7' },
  expense_deleted: { icon: 'remove-circle', color: '#E74C3C' },
  settlement: { icon: 'handshake', color: '#00B894' },
  group_created: { icon: 'group-add', color: '#E84393' },
  member_added: { icon: 'person-add', color: '#00CEC9' },
  member_removed: { icon: 'person-remove', color: '#E17055' },
};

const formatActivityDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
};

const ActivityItem: React.FC<{ activity: Activity; currentUserId: string }> = ({ activity, currentUserId }) => {
  const colors = useThemeColors();
  const iconInfo = ACTIVITY_ICONS[activity.type] || { icon: 'info', color: '#636E72' };
  const isYou = activity.createdBy === currentUserId;

  return (
    <View style={[styles.activityItem, { borderBottomColor: colors.borderLight }]}>
      <View style={[styles.activityIcon, { backgroundColor: iconInfo.color + '18' }]}>
        <MaterialIcons name={iconInfo.icon as any} size={22} color={iconInfo.color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityText, { color: colors.text }]}>
          <Text style={styles.activityBold}>
            {isYou ? 'You' : activity.createdByName}
          </Text>
          {' '}{activity.description}
        </Text>
        {activity.groupName && (
          <Text style={[styles.activityGroup, { color: colors.textTertiary }]}>
            in {activity.groupName}
          </Text>
        )}
        <Text style={[styles.activityDate, { color: colors.textTertiary }]}>
          {formatActivityDate(activity.createdAt)}
        </Text>
      </View>
      {activity.amount != null && (
        <Text style={[styles.activityAmount, { color: colors.text }]}>
          {formatCurrency(activity.amount, activity.currency || 'USD')}
        </Text>
      )}
    </View>
  );
};

export default function ActivityScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { activities, fetchActivities } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchActivities();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 700 : width;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isWide && { alignSelf: 'center', width: contentMaxWidth },
          activities.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <ActivityItem activity={item} currentUserId={user?.id || ''} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-none"
            title="No activity yet"
            subtitle="Your expense activity will show up here"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  activityBold: {
    fontWeight: '700',
  },
  activityGroup: {
    fontSize: 12,
    marginTop: 2,
  },
  activityDate: {
    fontSize: 12,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
