import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useGroupStore } from '@/stores/useGroupStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { getCategoryInfo } from '@/constants/Categories';
import { formatCurrency } from '@/constants/Currencies';
import { EmptyState } from '@/components/EmptyState';
import { GroupMember } from '@/types';

type TimeRangeKey = 'all' | '7d' | '30d' | '3m' | '1y';

const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '3m', label: 'Last 3 months' },
  { key: '1y', label: 'This year' },
];

function getDateRangeForPreset(preset: TimeRangeKey): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  const to = today.toISOString().split('T')[0];
  switch (preset) {
    case '7d': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { dateFrom: d.toISOString().split('T')[0], dateTo: to };
    }
    case '30d': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { dateFrom: d.toISOString().split('T')[0], dateTo: to };
    }
    case '3m': {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 2);
      return { dateFrom: d.toISOString().split('T')[0], dateTo: to };
    }
    case '1y': {
      const y = today.getFullYear();
      return { dateFrom: `${y}-01-01`, dateTo: to };
    }
    default:
      return {};
  }
}

export default function ChartsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups } = useGroupStore();
  const {
    categoryTotals,
    monthlyTotals,
    analyticsExpenses,
    fetchAnalytics,
    isLoading,
  } = useExpenseStore();

  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all');
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 800 : width;

  const filters = useMemo((): AnalyticsFilter => {
    const { dateFrom, dateTo } = getDateRangeForPreset(timeRange);
    return {
      ...(groupId ? { groupId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(userId ? { userId } : {}),
    };
  }, [groupId, timeRange, userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchAnalytics(filters);
  }, [fetchAnalytics, filters]);

  const groupLabel = useMemo(() => {
    if (!groupId) return 'All groups';
    return groups.find((g) => g.id === groupId)?.name ?? 'All groups';
  }, [groupId, groups]);

  const userOptions = useMemo(() => {
    const options: { id: string | undefined; label: string }[] = [
      { id: undefined, label: 'Everyone' },
      { id: user?.id, label: 'Me' },
    ];
    if (groupId) {
      const group = groups.find((g) => g.id === groupId);
      group?.members?.forEach((m: GroupMember) => {
        if (m.userId !== user?.id) options.push({ id: m.userId, label: m.name });
      });
    }
    return options;
  }, [groupId, groups, user?.id]);

  const userLabel = useMemo(() => {
    if (!userId) return 'Everyone';
    if (userId === user?.id) return 'Me';
    const g = groups.find((gr) => gr.members?.some((m) => m.userId === userId));
    const member = g?.members?.find((m) => m.userId === userId);
    return member?.name ?? 'Someone';
  }, [userId, user?.id, groups]);

  const totalSpent = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  const maxCategoryTotal = Math.max(...categoryTotals.map((c) => c.total), 1);
  const maxMonthlyTotal = Math.max(...monthlyTotals.map((m) => m.total), 1);
  const hasFilters = groupId || timeRange !== 'all' || userId;

  const clearFilters = useCallback(() => {
    setGroupId(undefined);
    setTimeRange('all');
    setUserId(undefined);
  }, []);

  if (analyticsExpenses.length === 0 && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.filterBar, { borderBottomColor: colors.border, paddingTop: insets.top }]}>
          <Text style={[styles.filterBarTitle, { color: colors.text }]}>Filters</Text>
        </View>
        <EmptyState
          icon="bar-chart"
          title={hasFilters ? 'No data for this filter' : 'No data yet'}
          subtitle={hasFilters ? 'Try changing group, time range, or user' : 'Add expenses to see your spending analytics'}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border, paddingTop: insets.top }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterScroll, { paddingBottom: 12 }]}
        >
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
            onPress={() => setShowGroupPicker(true)}
          >
            <MaterialIcons name="group" size={16} color={colors.textSecondary} />
            <Text style={[styles.filterChipText, { color: colors.text }]} numberOfLines={1}>
              {groupLabel}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          {TIME_RANGES.map((tr) => (
            <TouchableOpacity
              key={tr.key}
              style={[
                styles.filterChip,
                timeRange === tr.key
                  ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              ]}
              onPress={() => setTimeRange(tr.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: timeRange === tr.key ? colors.primary : colors.text },
                ]}
                numberOfLines={1}
              >
                {tr.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
            onPress={() => setShowUserPicker(true)}
          >
            <MaterialIcons name="person" size={16} color={colors.textSecondary} />
            <Text style={[styles.filterChipText, { color: colors.text }]} numberOfLines={1}>
              {userLabel}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          {hasFilters && (
            <TouchableOpacity
              style={[styles.filterChip, { borderColor: colors.border }]}
              onPress={clearFilters}
            >
              <MaterialIcons name="clear" size={16} color={colors.textSecondary} />
              <Text style={[styles.filterChipText, { color: colors.textSecondary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isWide ? { alignSelf: 'center' as const, width: contentMaxWidth } : undefined, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>
              {formatCurrency(totalSpent)}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textTertiary }]}>
              across {analyticsExpenses.length} expenses
              {hasFilters ? ' (filtered)' : ''}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
            {categoryTotals.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No category data in this range</Text>
            ) : (
              categoryTotals.map((item) => {
                const catInfo = getCategoryInfo(item.category as any);
                const percentage = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0;
                const barWidth = (item.total / maxCategoryTotal) * 100;
                return (
                  <View key={item.category} style={styles.categoryRow}>
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: catInfo.color + '20' }]}>
                        <MaterialIcons name={catInfo.icon as any} size={18} color={catInfo.color} />
                      </View>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{catInfo.label}</Text>
                      <Text style={[styles.categoryAmount, { color: colors.text }]}>
                        {formatCurrency(item.total)}
                      </Text>
                      <Text style={[styles.categoryPercent, { color: colors.textTertiary }]}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={[styles.barBg, { backgroundColor: colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.barFill,
                          { backgroundColor: catInfo.color, width: `${barWidth}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Spending</Text>
            {monthlyTotals.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No monthly data in this range</Text>
            ) : (
              monthlyTotals.map((item) => {
                const barWidth = (item.total / maxMonthlyTotal) * 100;
                const [y, m] = item.month.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const label = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
                return (
                  <View key={item.month} style={styles.monthRow}>
                    <View style={styles.monthHeader}>
                      <Text style={[styles.monthName, { color: colors.text }]}>{label}</Text>
                      <Text style={[styles.monthAmount, { color: colors.text }]}>
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                    <View style={[styles.barBg, { backgroundColor: colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.barFill,
                          { backgroundColor: colors.primary, width: `${barWidth}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="receipt"
                label="Total Expenses"
                value={analyticsExpenses.length.toString()}
                colors={colors}
              />
              <StatCard
                icon="trending-up"
                label="Average"
                value={formatCurrency(totalSpent / (analyticsExpenses.length || 1))}
                colors={colors}
              />
              <StatCard
                icon="arrow-upward"
                label="Highest"
                value={formatCurrency(Math.max(...analyticsExpenses.map((e) => e.amount), 0))}
                colors={colors}
              />
              <StatCard
                icon="category"
                label="Categories"
                value={categoryTotals.length.toString()}
                colors={colors}
              />
            </View>
          </View>
        </ScrollView>
      )}

      {/* Group picker modal */}
      <Modal visible={showGroupPicker} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowGroupPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Group</Text>
              <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.pickerRow, { borderBottomColor: colors.borderLight }]}
                onPress={() => { setGroupId(undefined); setShowGroupPicker(false); }}
              >
                <Text style={[styles.pickerRowText, { color: colors.text }]}>All groups</Text>
                {!groupId && <MaterialIcons name="check" size={22} color={colors.primary} />}
              </TouchableOpacity>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.pickerRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => { setGroupId(g.id); setShowGroupPicker(false); }}
                >
                  <Text style={[styles.pickerRowText, { color: colors.text }]}>{g.name}</Text>
                  {groupId === g.id && <MaterialIcons name="check" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* User picker modal */}
      <Modal visible={showUserPicker} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowUserPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>User</Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {userOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id ?? 'all'}
                  style={[styles.pickerRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => { setUserId(opt.id); setShowUserPicker(false); }}
                >
                  <Text style={[styles.pickerRowText, { color: colors.text }]}>{opt.label}</Text>
                  {userId === opt.id && <MaterialIcons name="check" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const StatCard = ({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) => (
  <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
    <MaterialIcons name={icon as any} size={24} color={colors.primary} />
    <Text style={[statStyles.value, { color: colors.text }]}>{value}</Text>
    <Text style={[statStyles.label, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 140,
  },
  value: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  label: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  filterBarTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: 160,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },
  summaryCard: {
    alignItems: 'center',
    padding: 28,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  summaryLabel: { fontSize: 13, fontWeight: '500' },
  summaryAmount: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  summarySub: { fontSize: 14, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyText: { fontStyle: 'italic', marginBottom: 8 },
  categoryRow: { marginBottom: 16 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '500' },
  categoryAmount: { fontSize: 14, fontWeight: '600' },
  categoryPercent: { fontSize: 12, minWidth: 44, textAlign: 'right' },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  monthRow: { marginBottom: 16 },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthName: { fontSize: 14, fontWeight: '500' },
  monthAmount: { fontSize: 14, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { maxHeight: 400, paddingVertical: 8 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowText: { fontSize: 16 },
});
