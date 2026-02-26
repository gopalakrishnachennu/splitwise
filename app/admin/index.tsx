import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { AdminStats, getAdminStats, getTopCategories, getTopUsers } from '@/services/admin';
import { haptic } from '@/utils/haptics';

export default function AdminDashboard() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [topSpenders, setTopSpenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWide = deviceType !== 'phone';
  const cardColumns = width > 1200 ? 4 : width > 768 ? 3 : 2;

  const fetchStats = useCallback(async () => {
    try {
      const [data, cats, users] = await Promise.all([
        getAdminStats(),
        getTopCategories(),
        getTopUsers(5),
      ]);
      setStats(data);
      setTopCategories(cats);
      setTopSpenders(users);
    } catch (e) {
      console.error('Failed to fetch admin stats', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchStats();
    setRefreshing(false);
  };

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const formatMoney = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard...</Text>
      </View>
    );
  }

  const metricCards = [
    { icon: 'people', label: 'Total Users', value: formatNumber(stats?.totalUsers || 0), color: '#6C5CE7', bg: '#6C5CE715' },
    { icon: 'group-work', label: 'Total Groups', value: formatNumber(stats?.totalGroups || 0), color: '#00B894', bg: '#00B89415' },
    { icon: 'receipt-long', label: 'Total Expenses', value: formatNumber(stats?.totalExpenses || 0), color: '#0984E3', bg: '#0984E315' },
    { icon: 'account-balance-wallet', label: 'Money Tracked', value: formatMoney(stats?.totalMoneyTracked || 0), color: '#FDCB6E', bg: '#FDCB6E25' },
    { icon: 'swap-horiz', label: 'Settlements', value: formatNumber(stats?.totalSettlements || 0), color: '#E17055', bg: '#E1705515' },
    { icon: 'timeline', label: 'Activities', value: formatNumber(stats?.totalActivities || 0), color: '#A29BFE', bg: '#A29BFE15' },
    { icon: 'person-add', label: 'Signups (24h)', value: formatNumber(stats?.recentSignups || 0), color: '#55EFC4', bg: '#55EFC415' },
    { icon: 'flash-on', label: 'Active Today', value: formatNumber(stats?.activeUsersToday || 0), color: '#FF7675', bg: '#FF767515' },
  ];

  const chartColors = ['#6C5CE7', '#0984E3', '#00B894', '#FDCB6E', '#E17055', '#A29BFE', '#55EFC4', '#FF7675'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, maxWidth: 1400, alignSelf: 'center', width: '100%' }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Live data from the database
        </Text>
      </View>

      {/* Owner control summary */}
      <View style={[styles.ownerCard, { backgroundColor: '#5BC5A712', borderColor: '#5BC5A740' }]}>
        <View style={styles.ownerCardRow}>
          <MaterialIcons name="admin-panel-settings" size={20} color="#5BC5A7" />
          <Text style={[styles.ownerCardTitle, { color: colors.text }]}>You have full control</Text>
        </View>
        <Text style={[styles.ownerCardText, { color: colors.textSecondary }]}>
          Users · Groups · Expenses · Analytics · Activity log (including admin actions) · System & maintenance · Promote/remove admins · App settings & branding. See Settings for the full list.
        </Text>
      </View>

      {/* Metric Cards */}
      <View style={[styles.cardGrid, { gap: 12 }]}>
        {metricCards.map((card, idx) => (
          <View
            key={idx}
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                width: `${100 / cardColumns - 2}%` as any,
                minWidth: 150,
              },
            ]}
          >
            <View style={[styles.metricIcon, { backgroundColor: card.bg }]}>
              <MaterialIcons name={card.icon as any} size={22} color={card.color} />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={isWide ? styles.gridRow : undefined}>
        <View style={isWide ? styles.gridCol : undefined}>
          {/* Top Categories */}
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Expense Categories</Text>
            {topCategories.length === 0 ? (
              <Text style={[styles.noData, { color: colors.textTertiary }]}>No expenses yet</Text>
            ) : (
              topCategories.slice(0, 6).map((cat, idx) => {
                const max = topCategories[0]?.total || 1;
                const pct = (cat.total / max) * 100;
                return (
                  <View key={idx} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                      {cat.category}
                    </Text>
                    <View style={[styles.barBg, { backgroundColor: colors.surfaceVariant }]}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: chartColors[idx] }]} />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>
                      ${cat.total.toFixed(0)} ({cat.count})
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={isWide ? styles.gridCol : undefined}>
          {/* Top Spenders */}
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Spenders</Text>
            {topSpenders.length === 0 ? (
              <Text style={[styles.noData, { color: colors.textTertiary }]}>No users yet</Text>
            ) : (
              topSpenders.map((user, idx) => (
                <View key={idx} style={[styles.leaderRow, { borderBottomColor: colors.borderLight }]}>
                  <View style={[styles.rankBadge, {
                    backgroundColor: idx < 3 ? ['#FFD70025', '#C0C0C025', '#CD7F3225'][idx] : colors.surfaceVariant,
                  }]}>
                    <Text style={[styles.rankText, {
                      color: idx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] : colors.textTertiary,
                    }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textTertiary }}>{user.email}</Text>
                  </View>
                  <Text style={[styles.leaderValue, { color: colors.primary }]}>
                    ${user.total.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  ownerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  ownerCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ownerCardTitle: { fontSize: 15, fontWeight: '700' },
  ownerCardText: { fontSize: 13, lineHeight: 20 },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  metricCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
    flexGrow: 1,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  gridRow: { flexDirection: 'row', gap: 16 },
  gridCol: { flex: 1 },
  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  noData: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  barLabel: { width: 80, fontSize: 12, fontWeight: '500' },
  barBg: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { width: 90, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700' },
  leaderName: { fontSize: 14, fontWeight: '500' },
  leaderValue: { fontSize: 14, fontWeight: '700' },
});
