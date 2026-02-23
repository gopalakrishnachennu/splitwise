import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { getCategoryInfo } from '@/constants/Categories';
import { formatCurrency } from '@/constants/Currencies';
import { EmptyState } from '@/components/EmptyState';

export default function ChartsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const { categoryTotals, monthlyTotals, fetchAnalytics, expenses } = useExpenseStore();

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 800 : width;

  useEffect(() => { fetchAnalytics(); }, []);

  const totalSpent = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  const maxCategoryTotal = Math.max(...categoryTotals.map((c) => c.total), 1);
  const maxMonthlyTotal = Math.max(...monthlyTotals.map((m) => m.total), 1);

  if (expenses.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="bar-chart"
          title="No data yet"
          subtitle="Add expenses to see your spending analytics"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={isWide ? { alignSelf: 'center', width: contentMaxWidth } : undefined}
    >
      <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10' }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
        <Text style={[styles.summaryAmount, { color: colors.text }]}>
          {formatCurrency(totalSpent)}
        </Text>
        <Text style={[styles.summarySub, { color: colors.textTertiary }]}>
          across {expenses.length} expenses
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
        {categoryTotals.map((item) => {
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
                    {
                      backgroundColor: catInfo.color,
                      width: `${barWidth}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Spending</Text>
        {monthlyTotals.map((item) => {
          const barWidth = (item.total / maxMonthlyTotal) * 100;
          const [year, month] = item.month.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const label = `${monthNames[parseInt(month) - 1]} ${year}`;

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
                    {
                      backgroundColor: colors.primary,
                      width: `${barWidth}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="receipt"
            label="Total Expenses"
            value={expenses.length.toString()}
            colors={colors}
          />
          <StatCard
            icon="trending-up"
            label="Average"
            value={formatCurrency(totalSpent / (expenses.length || 1))}
            colors={colors}
          />
          <StatCard
            icon="arrow-upward"
            label="Highest"
            value={formatCurrency(Math.max(...expenses.map((e) => e.amount), 0))}
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

      <View style={{ height: 60 }} />
    </ScrollView>
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
  summaryCard: {
    alignItems: 'center',
    padding: 28,
    margin: 16,
    borderRadius: 16,
  },
  summaryLabel: { fontSize: 13, fontWeight: '500' },
  summaryAmount: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  summarySub: { fontSize: 14, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
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
});
