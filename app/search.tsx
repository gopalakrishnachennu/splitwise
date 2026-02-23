import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType, useDebounce } from '@/utils/hooks';
import { Input } from '@/components/Input';
import { ExpenseCard } from '@/components/ExpenseCard';
import { EmptyState } from '@/components/EmptyState';
import { CATEGORIES } from '@/constants/Categories';

export default function SearchScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { searchResults, searchExpenses } = useExpenseStore();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 700 : width;

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    if (debouncedQuery.trim()) {
      searchExpenses(debouncedQuery.trim());
      setHasSearched(true);
    }
  }, [debouncedQuery]);

  const filteredResults = selectedCategory
    ? searchResults.filter((e) => e.category === selectedCategory)
    : searchResults;

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
              subtitle={`No expenses matching "${query}"`}
            />
          ) : (
            <EmptyState
              icon="search"
              title="Search Expenses"
              subtitle="Type to search by description, category, or amount"
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
});
