import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { AdminActivity, getAdminActivityLog } from '@/services/admin';
import { haptic } from '@/utils/haptics';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  expense_added: { icon: 'add-circle', color: '#0984E3' },
  expense_updated: { icon: 'edit', color: '#6C5CE7' },
  expense_deleted: { icon: 'delete', color: '#E74C3C' },
  group_created: { icon: 'group-add', color: '#00B894' },
  group_deleted: { icon: 'group-remove', color: '#E17055' },
  friend_added: { icon: 'person-add', color: '#55EFC4' },
  friend_removed: { icon: 'person-remove', color: '#FF7675' },
  settlement: { icon: 'swap-horiz', color: '#FDCB6E' },
  payment: { icon: 'payment', color: '#A29BFE' },
};

export default function AdminActivityLogScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const isWide = deviceType !== 'phone';

  const fetchActivities = useCallback(async () => {
    try {
      const data = await getAdminActivityLog(200);
      setActivities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchActivities();
    setRefreshing(false);
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.type.includes(filter));

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'expense', label: 'Expenses' },
    { key: 'group', label: 'Groups' },
    { key: 'friend', label: 'Friends' },
    { key: 'settlement', label: 'Settlements' },
  ];

  const formatTimestamp = (ts: string): string => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, maxWidth: 1000, alignSelf: 'center', width: '100%' }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Activity Log</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Complete audit trail of all platform activity ({activities.length} events)
      </Text>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, {
                backgroundColor: active ? colors.primary : colors.surfaceVariant,
                borderColor: active ? colors.primary : colors.borderLight,
              }]}
              onPress={() => { haptic.selection(); setFilter(f.key); }}
            >
              <Text style={[styles.filterLabel, { color: active ? '#FFF' : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeline */}
      {filteredActivities.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="history" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No activity to show</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {filteredActivities.map((activity, idx) => {
            const config = TYPE_CONFIG[activity.type] || { icon: 'circle', color: colors.textTertiary };
            return (
              <View key={activity.id} style={styles.timelineItem}>
                {/* Timeline line */}
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: config.color }]}>
                    <MaterialIcons name={config.icon as any} size={14} color="#FFF" />
                  </View>
                  {idx < filteredActivities.length - 1 && (
                    <View style={[styles.timelineConnector, { backgroundColor: colors.borderLight }]} />
                  )}
                </View>

                {/* Content */}
                <View style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  <View style={styles.timelineHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
                      <Text style={[styles.typeText, { color: config.color }]}>
                        {activity.type.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                      {formatTimestamp(activity.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.description, { color: colors.text }]}>
                    {activity.description}
                  </Text>
                  <View style={styles.timelineMeta}>
                    {activity.createdByName && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="person" size={12} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                          {activity.createdByName}
                        </Text>
                      </View>
                    )}
                    {activity.groupName && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="group" size={12} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                          {activity.groupName}
                        </Text>
                      </View>
                    )}
                    {activity.amount != null && activity.amount > 0 && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="payments" size={12} color={colors.primary} />
                        <Text style={[styles.metaText, { color: colors.primary }]}>
                          {activity.currency || '$'}{activity.amount.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  filterRow: { marginBottom: 16, maxHeight: 40 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterLabel: { fontSize: 13, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
  timeline: { paddingLeft: 4 },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLine: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: -2,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  timestamp: { fontSize: 11 },
  description: { fontSize: 14, lineHeight: 20 },
  timelineMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '500' },
});
