import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, useWindowDimensions, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType, useDebounce } from '@/utils/hooks';
import { Input } from '@/components/Input';
import { ExpenseCard } from '@/components/ExpenseCard';
import { EmptyState } from '@/components/EmptyState';
import { CATEGORIES } from '@/constants/Categories';
import { sanitizeDecimalInput } from '@/utils/validation';

export default function SearchScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { searchResults, searchExpenses } = useExpenseStore();
  const { friends } = useFriendStore();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payerId, setPayerId] = useState<string | null>(null);

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 700 : width;

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    if (debouncedQuery.trim()) {
      searchExpenses(debouncedQuery.trim());
      setHasSearched(true);
    }
  }, [debouncedQuery]);

  const filteredResults = useMemo(() => {
    let list = selectedCategory
      ? searchResults.filter((e) => e.category === selectedCategory)
      : searchResults;

    const min = parseFloat(minAmount || '0');
    const max = parseFloat(maxAmount || '0');
    if (minAmount.trim()) {
      list = list.filter((e) => e.amount >= (Number.isNaN(min) ? 0 : min));
    }
    if (maxAmount.trim()) {
      list = list.filter((e) => e.amount <= (Number.isNaN(max) ? Number.MAX_SAFE_INTEGER : max));
    }

    if (dateFrom.trim()) {
      list = list.filter((e) => (e.date || '') >= dateFrom.trim());
    }
    if (dateTo.trim()) {
      list = list.filter((e) => (e.date || '') <= dateTo.trim());
    }

    if (payerId) {
      list = list.filter((e) => e.paidBy.some((p) => p.userId === payerId));
    }

    return list;
  }, [searchResults, selectedCategory, minAmount, maxAmount, dateFrom, dateTo, payerId]);

  const hasActiveFilters = !!(
    selectedCategory ||
    minAmount.trim() ||
    maxAmount.trim() ||
    dateFrom.trim() ||
    dateTo.trim() ||
    payerId
  );

  const payerOptions = useMemo(() => {
    const opts: { id: string | null; label: string }[] = [{ id: null, label: 'Anyone' }];
    if (user) opts.push({ id: user.id, label: 'You' });
    friends.forEach((f) => {
      opts.push({ id: f.friendId, label: f.friendName });
    });
    return opts;
  }, [friends, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, isWide && { alignSelf: 'center', width: contentMaxWidth }]}>
        <Input
          placeholder="Search expenses..."
          value={query}
          onChangeText={setQuery}
          leftIcon="search"
          autoFocus
          containerStyle={{ marginBottom: 0 }}
        />

        <FlatList
          horizontal
          data={[{ key: 'all', label: 'All', icon: 'apps' }, ...CATEGORIES.slice(0, 10)]}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.filterChip,
                {
                  backgroundColor: (selectedCategory === null && item.key === 'all') || selectedCategory === item.key
                    ? colors.primary + '20'
                    : colors.surface,
                  borderColor: (selectedCategory === null && item.key === 'all') || selectedCategory === item.key
                    ? colors.primary
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: (selectedCategory === null && item.key === 'all') || selectedCategory === item.key
                      ? colors.primary
                      : colors.textSecondary,
                  },
                ]}
                onPress={() => setSelectedCategory(item.key === 'all' ? null : item.key)}
              >
                {item.label}
              </Text>
            </View>
          )}
        />

        <View style={styles.advancedRow}>
          <TouchableOpacity
            style={[
              styles.advancedToggle,
              { borderColor: hasActiveFilters ? colors.primary : colors.border },
            ]}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            <MaterialIcons
              name="tune"
              size={18}
              color={hasActiveFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.advancedToggleText,
                { color: hasActiveFilters ? colors.primary : colors.textSecondary },
              ]}
            >
              Filters
            </Text>
          </TouchableOpacity>
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory(null);
                setMinAmount('');
                setMaxAmount('');
                setDateFrom('');
                setDateTo('');
                setPayerId(null);
              }}
            >
              <Text style={[styles.clearText, { color: colors.textTertiary }]}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {showAdvanced && (
          <View style={styles.advancedPanel}>
            <View style={styles.advancedRowInner}>
              <View style={styles.advancedField}>
                <Text style={[styles.advancedLabel, { color: colors.textSecondary }]}>Min</Text>
                <Input
                  placeholder="0"
                  value={minAmount}
                  onChangeText={(t) => setMinAmount(sanitizeDecimalInput(t))}
                  keyboardType="decimal-pad"
                  leftIcon="attach-money"
                />
              </View>
              <View style={styles.advancedField}>
                <Text style={[styles.advancedLabel, { color: colors.textSecondary }]}>Max</Text>
                <Input
                  placeholder="Any"
                  value={maxAmount}
                  onChangeText={(t) => setMaxAmount(sanitizeDecimalInput(t))}
                  keyboardType="decimal-pad"
                  leftIcon="attach-money"
                />
              </View>
            </View>

            <View style={styles.advancedRowInner}>
              <View style={styles.advancedField}>
                <Text style={[styles.advancedLabel, { color: colors.textSecondary }]}>From</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  leftIcon="event"
                />
              </View>
              <View style={styles.advancedField}>
                <Text style={[styles.advancedLabel, { color: colors.textSecondary }]}>To</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={dateTo}
                  onChangeText={setDateTo}
                  leftIcon="event"
                />
              </View>
            </View>

            <View style={styles.advancedPayerRow}>
              <Text style={[styles.advancedLabel, { color: colors.textSecondary }]}>Payer</Text>
              <FlatList
                horizontal
                data={payerOptions}
                keyExtractor={(item) => item.id ?? 'all'}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4 }}
                renderItem={({ item }) => {
                  const selected = payerId === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.payerChip,
                        {
                          backgroundColor: selected ? colors.primary + '20' : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setPayerId(item.id)}
                    >
                      <Text
                        style={[
                          styles.payerChipText,
                          { color: selected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.results,
          isWide && { alignSelf: 'center', width: contentMaxWidth },
          filteredResults.length === 0 && hasSearched && { flex: 1 },
        ]}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            currentUserId={user?.id || ''}
            onPress={() => router.push(`/expense/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          hasSearched ? (
            <EmptyState
              icon="search-off"
              title="No results found"
              subtitle={
                hasActiveFilters
                  ? 'Try adjusting your filters or search term'
                  : `No expenses matching "${query}"`
              }
            />
          ) : (
            <EmptyState
              icon="search"
              title="Search Expenses"
              subtitle="Type to search and use filters for amount, date, and payer"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { padding: 16, paddingBottom: 0 },
  categoryFilter: { marginTop: 12, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  results: { padding: 16 },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  advancedToggleText: { fontSize: 13, fontWeight: '500' },
  clearText: { fontSize: 12 },
  advancedPanel: { marginTop: 8, gap: 8 },
  advancedRowInner: { flexDirection: 'row', gap: 8 },
  advancedField: { flex: 1 },
  advancedLabel: { fontSize: 12, marginBottom: 2 },
  advancedPayerRow: { marginTop: 4 },
  payerChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  payerChipText: { fontSize: 13 },
});
