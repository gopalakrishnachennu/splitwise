import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import {
  getTopCategories, getTopUsers, getTopGroups,
  getMonthlyExpenses, getDailySignups,
  getCurrencyDistribution, getSplitTypeDistribution,
  TopCategory,
} from '@/services/admin';
import { haptic } from '@/utils/haptics';

export default function AdminAnalyticsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topGroups, setTopGroups] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);
  const [dailySignups, setDailySignups] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [splitTypes, setSplitTypes] = useState<any[]>([]);

  const isWide = deviceType !== 'phone';

  const fetchAll = useCallback(async () => {
    try {
      const [cats, users, groups, monthly, daily, curr, splits] = await Promise.all([
        getTopCategories(),
        getTopUsers(),
        getTopGroups(),
        getMonthlyExpenses(),
        getDailySignups(),
        getCurrencyDistribution(),
        getSplitTypeDistribution(),
      ]);
      setTopCategories(cats);
      setTopUsers(users);
      setTopGroups(groups);
      setMonthlyExpenses(monthly);
      setDailySignups(daily);
      setCurrencies(curr);
      setSplitTypes(splits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchAll();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const chartColors = ['#6C5CE7', '#0984E3', '#00B894', '#FDCB6E', '#E17055', '#A29BFE', '#55EFC4', '#FF7675'];

  const BarChart = ({ data, valueKey, labelKey, title }: { data: any[]; valueKey: string; labelKey: string; title: string }) => {
    const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
        {data.length === 0 ? (
          <Text style={[styles.noData, { color: colors.textTertiary }]}>No data yet</Text>
        ) : (
          data.slice(0, 8).map((item, idx) => {
            const pct = ((item[valueKey] || 0) / max) * 100;
            return (
              <View key={idx} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item[labelKey]}
                </Text>
                <View style={[styles.barBg, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: chartColors[idx % chartColors.length] }]} />
                </View>
                <Text style={[styles.barValue, { color: colors.text }]}>
                  {typeof item[valueKey] === 'number' ? (item[valueKey] > 1000 ? `$${(item[valueKey] / 1000).toFixed(1)}K` : item[valueKey].toFixed?.(2) ?? item[valueKey]) : item[valueKey]}
                </Text>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const DonutLegend = ({ data, title, valueKey, labelKey }: { data: any[]; title: string; valueKey: string; labelKey: string }) => {
    const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0) || 1;
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
        {data.length === 0 ? (
          <Text style={[styles.noData, { color: colors.textTertiary }]}>No data yet</Text>
        ) : (
          <View>
            <View style={styles.donutRow}>
              {data.slice(0, 6).map((item, idx) => {
                const pct = ((item[valueKey] / total) * 100).toFixed(1);
                return (
                  <View key={idx} style={styles.donutItem}>
                    <View style={[styles.donutColor, { backgroundColor: chartColors[idx % chartColors.length] }]} />
                    <Text style={[styles.donutLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item[labelKey]}
                    </Text>
                    <Text style={[styles.donutPct, { color: colors.text }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
            {/* Simple visual bar representation */}
            <View style={[styles.compositeBar, { backgroundColor: colors.surfaceVariant }]}>
              {data.slice(0, 6).map((item, idx) => {
                const pct = (item[valueKey] / total) * 100;
                return (
                  <View key={idx} style={{ width: `${pct}%` as any, height: 12, backgroundColor: chartColors[idx % chartColors.length] }} />
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const LeaderboardCard = ({ data, title, nameKey, valueKey, valuePrefix }: { data: any[]; title: string; nameKey: string; valueKey: string; valuePrefix?: string }) => (
    <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
      {data.length === 0 ? (
        <Text style={[styles.noData, { color: colors.textTertiary }]}>No data yet</Text>
      ) : (
        data.slice(0, 8).map((item, idx) => (
          <View key={idx} style={[styles.leaderRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] + '25' : colors.surfaceVariant }]}>
              <Text style={[styles.rankText, { color: idx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] : colors.textTertiary }]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>{item[nameKey]}</Text>
            <Text style={[styles.leaderValue, { color: colors.primary }]}>
              {valuePrefix || ''}{typeof item[valueKey] === 'number' ? item[valueKey].toFixed(2) : item[valueKey]}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, maxWidth: 1400, alignSelf: 'center', width: '100%' }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Analytics & Insights</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Understand platform trends and user behavior
      </Text>

      <View style={isWide ? styles.gridRow : undefined}>
        <View style={isWide ? styles.gridCol : undefined}>
          <BarChart data={topCategories} valueKey="total" labelKey="category" title="Spending by Category" />
          <BarChart data={monthlyExpenses} valueKey="total" labelKey="month" title="Monthly Expense Volume" />
          <LeaderboardCard data={topUsers} title="Top Spenders" nameKey="name" valueKey="total" valuePrefix="$" />
        </View>
        <View style={isWide ? styles.gridCol : undefined}>
          <DonutLegend data={currencies} title="Currency Distribution" valueKey="count" labelKey="currency" />
          <DonutLegend data={splitTypes} title="Split Type Usage" valueKey="count" labelKey="splitType" />
          <LeaderboardCard data={topGroups} title="Top Groups by Volume" nameKey="name" valueKey="total" valuePrefix="$" />
          <BarChart data={dailySignups} valueKey="count" labelKey="date" title="Daily Signups" />
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  gridRow: { flexDirection: 'row', gap: 16 },
  gridCol: { flex: 1 },
  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  noData: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  barLabel: { width: 80, fontSize: 12, fontWeight: '500' },
  barBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { width: 60, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  donutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  donutItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  donutColor: { width: 10, height: 10, borderRadius: 3 },
  donutLabel: { fontSize: 12 },
  donutPct: { fontSize: 12, fontWeight: '600' },
  compositeBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
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
  leaderName: { flex: 1, fontSize: 14, fontWeight: '500' },
  leaderValue: { fontSize: 14, fontWeight: '700' },
});
