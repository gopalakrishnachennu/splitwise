import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { ExpenseCard } from '@/components/ExpenseCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/constants/Currencies';

export default function PersonalExpensesScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { expenses, fetchExpenses } = useExpenseStore();

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 700 : width;

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const personalExpenses = useMemo(() => {
    if (!user) return [];
    return expenses.filter((e) => {
      if (e.groupId) return false;
      const uid = user.id;
      return (
        e.createdBy === uid ||
        e.paidBy.some((p) => p.userId === uid) ||
        e.splitBetween.some((s) => s.userId === uid)
      );
    });
  }, [expenses, user]);

  const totalSpent = personalExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Please sign in to view your expenses.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Personal expenses', headerBackTitle: 'Back' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={
          isWide
            ? { alignSelf: 'center', width: contentMaxWidth, paddingBottom: 40 }
            : { paddingBottom: 40 }
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10' }]}>
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Non-group expenses
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>
              {formatCurrency(totalSpent, user.defaultCurrency)}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textTertiary }]}>
              {personalExpenses.length} expense{personalExpenses.length === 1 ? '' : 's'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addFab, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/expense/add')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <Button
            title="Add Expense"
            onPress={() => router.push('/expense/add')}
            size="small"
            icon={<MaterialIcons name="add" size={18} color="#FFF" />}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses without a group</Text>
          {personalExpenses.length > 0 ? (
            personalExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currentUserId={user.id}
                onPress={() => router.push(`/expense/${expense.id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon="receipt-long"
              title="No personal expenses"
              subtitle="Create an expense without selecting a group to see it here."
              actionTitle="Add Expense"
              onAction={() => router.push('/expense/add')}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  summaryLeft: {
    flex: 1,
    paddingRight: 48,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  summarySub: {
    fontSize: 14,
    marginTop: 4,
  },
  addFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
});

