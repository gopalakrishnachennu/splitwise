import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType, useDebounce } from '@/utils/hooks';
import { AdminExpense, getAdminExpenses, deleteExpenseAdmin } from '@/services/admin';
import { haptic } from '@/utils/haptics';
import { CATEGORIES, getCategoryInfo } from '@/constants/Categories';
import { ExpenseCategory } from '@/types';

const FILTER_CATS = ['all', 'food', 'transport', 'entertainment', 'shopping', 'bills', 'health', 'other'];

export default function AdminExpensesScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const isWide = deviceType !== 'phone';

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await getAdminExpenses(debouncedSearch, category);
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchExpenses();
    setRefreshing(false);
  };

  const handleDeleteExpense = (expense: AdminExpense) => {
    haptic.warning();
    Alert.alert(
      'Delete Expense',
      `Delete "${expense.description}" ($${expense.amount.toFixed(2)})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptic.heavy();
            await deleteExpenseAdmin(expense.id);
            fetchExpenses();
          },
        },
      ]
    );
  };

  const handleFlagExpense = (expense: AdminExpense) => {
    haptic.warning();
    Alert.alert('Flagged', `Expense "${expense.description}" has been flagged for review.`);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const flaggedCount = expenses.filter((e) => e.isFlagged).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Expense Oversight</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Monitor all transactions and flag suspicious activity
      </Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#0984E310', borderColor: '#0984E330' }]}>
          <MaterialIcons name="receipt-long" size={20} color="#0984E3" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{expenses.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#00B89410', borderColor: '#00B89430' }]}>
          <MaterialIcons name="payments" size={20} color="#00B894" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>${totalAmount.toFixed(0)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Volume</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: flaggedCount > 0 ? '#E74C3C10' : '#00B89410', borderColor: flaggedCount > 0 ? '#E74C3C30' : '#00B89430' }]}>
          <MaterialIcons name="flag" size={20} color={flaggedCount > 0 ? '#E74C3C' : '#00B894'} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{flaggedCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Flagged</Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <MaterialIcons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }, Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
          placeholder="Search expenses..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTER_CATS.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, {
                backgroundColor: active ? colors.primary : colors.surfaceVariant,
                borderColor: active ? colors.primary : colors.borderLight,
              }]}
              onPress={() => { haptic.selection(); setCategory(cat); }}
            >
              <Text style={[styles.filterLabel, { color: active ? '#FFF' : colors.textSecondary }]}>
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Expense List */}
      {expenses.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="receipt-long" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses found</Text>
        </View>
      ) : (
        expenses.map((e) => {
          const catInfo = getCategoryInfo(e.category as ExpenseCategory);
          return (
            <View
              key={e.id}
              style={[
                styles.expenseCard,
                { backgroundColor: colors.card, borderColor: e.isFlagged ? '#E74C3C50' : colors.borderLight },
                e.isFlagged && { borderLeftWidth: 3, borderLeftColor: '#E74C3C' },
              ]}
            >
              <View style={styles.expenseRow}>
                <View style={[styles.catIcon, { backgroundColor: catInfo.color + '15' }]}>
                  <Text style={{ fontSize: 18 }}>{catInfo.icon}</Text>
                </View>
                <View style={styles.expenseInfo}>
                  <View style={styles.expenseTop}>
                    <Text style={[styles.expenseName, { color: colors.text }]} numberOfLines={1}>
                      {e.description}
                    </Text>
                    <Text style={[styles.expenseAmount, { color: colors.text }]}>
                      {e.currency} {e.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.expenseMeta}>
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      by {e.createdByName}
                    </Text>
                    {e.groupName && (
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                        in {e.groupName}
                      </Text>
                    )}
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      {new Date(e.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.expenseActions}>
                    <View style={[styles.tag, { backgroundColor: catInfo.color + '15' }]}>
                      <Text style={[styles.tagText, { color: catInfo.color }]}>{e.category}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>{e.splitType}</Text>
                    </View>
                    {e.isFlagged && (
                      <View style={[styles.tag, { backgroundColor: '#E74C3C15' }]}>
                        <MaterialIcons name="warning" size={10} color="#E74C3C" />
                        <Text style={[styles.tagText, { color: '#E74C3C' }]}>High Value</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => handleFlagExpense(e)} style={{ padding: 4 }}>
                      <MaterialIcons name="flag" size={18} color={colors.warning} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteExpense(e)} style={{ padding: 4 }}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
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
  expenseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  expenseRow: { flexDirection: 'row', gap: 12 },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: { flex: 1 },
  expenseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseName: { fontSize: 15, fontWeight: '600', flex: 1 },
  expenseAmount: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  expenseMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
  metaText: { fontSize: 12 },
  expenseActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  tagText: { fontSize: 11, fontWeight: '500' },
});
