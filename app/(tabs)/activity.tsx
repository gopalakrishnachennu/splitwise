import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday, isYesterday, parseISO, isThisWeek } from 'date-fns';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { formatCurrency } from '@/constants/Currencies';
import { Activity } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { haptic } from '@/utils/haptics';

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  expense_added: { icon: 'receipt', color: '#636E72' },
  expense_updated: { icon: 'edit', color: '#6C5CE7' },
  expense_deleted: { icon: 'remove-circle', color: '#E74C3C' },
  settlement: { icon: 'handshake', color: '#00B894' },
  group_created: { icon: 'group-add', color: '#E84393' },
  member_added: { icon: 'person-add', color: '#00CEC9' },
  member_removed: { icon: 'person-remove', color: '#E17055' },
};

const formatActivityDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  const timeStr = format(date, 'h:mm a');
  if (isToday(date)) return `Today at ${timeStr}`;
  if (isYesterday(date)) return `Yesterday at ${timeStr}`;
  if (isThisWeek(date, { weekStartsOn: 1 })) return `${format(date, 'EEEE')} at ${timeStr}`;
  return `${format(date, 'MMM d, yyyy')} at ${timeStr}`;
};

const ActivityItem: React.FC<{
  activity: Activity;
  currentUserId: string;
  colors: ReturnType<typeof useThemeColors>;
}> = ({ activity, currentUserId, colors }) => {
  const iconInfo = ACTIVITY_ICONS[activity.type] || { icon: 'info', color: '#636E72' };
  const isYou = activity.createdBy === currentUserId;
  const actorName = isYou ? 'You' : activity.createdByName;

  const renderDescription = () => {
    const desc = activity.description;
    const quoteMatch = desc.match(/"([^"]+)"/);

    if (quoteMatch) {
      const before = desc.slice(0, quoteMatch.index);
      const quoted = quoteMatch[1];
      const after = desc.slice((quoteMatch.index ?? 0) + quoteMatch[0].length);

      return (
        <Text style={[styles.activityText, { color: colors.text }]}>
          <Text style={styles.activityBold}>{actorName}</Text>
          {' '}{before}"{quoted}"{after}
        </Text>
      );
    }

    return (
      <Text style={[styles.activityText, { color: colors.text }]}>
        <Text style={styles.activityBold}>{actorName}</Text>
        {' '}{desc}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.activityItem, { borderBottomColor: colors.borderLight }]}
      onPress={() => {
        haptic.light();
        if (activity.expenseId) {
          router.push(`/expense/${activity.expenseId}`);
        } else if (activity.groupId) {
          router.push(`/group/${activity.groupId}`);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.activityIcon, { backgroundColor: iconInfo.color }]}>
          <MaterialIcons name={iconInfo.icon as any} size={20} color="#FFF" />
        </View>
        <View style={styles.involvementDot} />
      </View>

      <View style={styles.activityContent}>
        {renderDescription()}
        {activity.amount != null && activity.amount > 0 && (
          <Text style={[styles.oweText, { color: colors.negative }]}>
            You owe {formatCurrency(activity.amount, activity.currency || 'USD')}
          </Text>
        )}
        <Text style={[styles.activityDate, { color: colors.textTertiary }]}>
          {formatActivityDate(activity.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ActivityScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const user = useAuthStore((s) => s.user);
  const { activities, fetchActivities } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);

  const isWide = deviceType === 'tablet' || deviceType === 'desktop';

  const loadData = useCallback(async () => {
    await fetchActivities();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    haptic.medium();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        { backgroundColor: colors.primary },
        isWide && styles.headerWide,
      ]}>
        <View style={isWide ? styles.headerInnerWide : styles.headerInner}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="account-balance-wallet" size={28} color="#FFF" />
          </View>
          <TouchableOpacity
            onPress={() => { haptic.light(); router.push('/search'); }}
            style={styles.headerIconBtn}
          >
            <MaterialIcons name="search" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isWide && styles.listContentWide,
          activities.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          activities.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent activity
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ActivityItem
            activity={item}
            currentUserId={user?.id || ''}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-none"
            title="No activity yet"
            subtitle="Your expense activity will show up here"
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, isWide && styles.fabWide]}
        onPress={() => { haptic.medium(); router.push('/expense/add'); }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="description" size={20} color="#FFF" />
        <Text style={styles.fabText}>Add expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerWide: {
    alignItems: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInnerWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 700,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  listContentWide: {
    alignSelf: 'center',
    maxWidth: 700,
    width: '100%',
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  involvementDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF652F',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 2,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  activityBold: {
    fontWeight: '700',
  },
  oweText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  activityDate: {
    fontSize: 12,
    marginTop: 3,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 78 : 68,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1CC29F',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
  },
  fabWide: {
    right: '50%',
    transform: [{ translateX: 310 }],
  },
  fabText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
