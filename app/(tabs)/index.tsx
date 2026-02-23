import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGroupStore } from '@/stores/useGroupStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { BalanceBar } from '@/components/BalanceBar';
import { GroupCard } from '@/components/GroupCard';
import { ExpenseCard } from '@/components/ExpenseCard';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/constants/Currencies';

export default function DashboardScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups } = useGroupStore();
  const { expenses, fetchExpenses, fetchActivities } = useExpenseStore();
  const { friends, fetchFriends } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      fetchGroups(),
      fetchExpenses(),
      fetchActivities(),
      fetchFriends(user.id),
    ]);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    haptic.medium();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalOwed = friends.reduce((sum, f) => f.balance > 0 ? sum + f.balance : sum, 0);
  const totalOwe = friends.reduce((sum, f) => f.balance < 0 ? sum + Math.abs(f.balance) : sum, 0);
  const totalBalance = totalOwed - totalOwe;

  const recentExpenses = expenses.slice(0, 5);
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';
  const isWide = isTablet || isDesktop;
  const maxWidth = isDesktop ? 800 : isTablet ? Math.min(width - 48, 700) : width;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        isWide && { alignSelf: 'center', maxWidth: maxWidth, width: '100%', paddingHorizontal: 8 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {user?.name || 'User'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
          >
            <MaterialIcons name="search" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <BalanceBar
        totalBalance={totalBalance}
        youOwe={totalOwe}
        youAreOwed={totalOwed}
        currency={user?.defaultCurrency}
      />

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/expense/add')}
        >
          <MaterialIcons name="add" size={20} color="#FFF" />
          <Text style={styles.actionText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => router.push('/settle-up')}
        >
          <MaterialIcons name="handshake" size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Settle Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => router.push('/group/create')}
        >
          <MaterialIcons name="group-add" size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>New Group</Text>
        </TouchableOpacity>
      </View>

      {isWide ? (
        <View style={styles.twoColumnRow}>
          <View style={styles.twoColumnLeft}>
            {groups.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Groups</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                  </TouchableOpacity>
                </View>
                {groups.slice(0, 3).map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() => router.push(`/group/${group.id}`)}
                  />
                ))}
              </View>
            )}

            {friends.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Friends</Text>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={[styles.friendRow, { borderBottomColor: colors.borderLight }]}
                    onPress={() => router.push(`/friend/${friend.id}`)}
                  >
                    <View style={[styles.friendAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.friendInitial, { color: colors.primary }]}>
                        {friend.friendName[0]}
                      </Text>
                    </View>
                    <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{friend.friendName}</Text>
                    <Text
                      style={[
                        styles.friendBalance,
                        { color: friend.balance >= 0 ? colors.positive : colors.negative },
                      ]}
                    >
                      {friend.balance >= 0 ? '+' : ''}{formatCurrency(friend.balance, friend.currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.twoColumnRight}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
                <TouchableOpacity onPress={() => router.push('/charts')}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>Charts</Text>
                </TouchableOpacity>
              </View>
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    currentUserId={user?.id || ''}
                    onPress={() => router.push(`/expense/${expense.id}`)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="receipt-long"
                  title="No expenses yet"
                  subtitle="Add your first expense to start tracking"
                  actionTitle="Add Expense"
                  onAction={() => router.push('/expense/add')}
                />
              )}
            </View>
          </View>
        </View>
      ) : (
        <>
          {groups.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Groups</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                </TouchableOpacity>
              </View>
              {groups.slice(0, 3).map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => router.push(`/group/${group.id}`)}
                />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => router.push('/charts')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Charts</Text>
              </TouchableOpacity>
            </View>
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currentUserId={user?.id || ''}
                  onPress={() => router.push(`/expense/${expense.id}`)}
                />
              ))
            ) : (
              <EmptyState
                icon="receipt-long"
                title="No expenses yet"
                subtitle="Add your first expense to start tracking"
                actionTitle="Add Expense"
                onAction={() => router.push('/expense/add')}
              />
            )}
          </View>

          {friends.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Friends</Text>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => router.push(`/friend/${friend.id}`)}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.friendInitial, { color: colors.primary }]}>
                      {friend.friendName[0]}
                    </Text>
                  </View>
                  <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{friend.friendName}</Text>
                  <Text
                    style={[
                      styles.friendBalance,
                      { color: friend.balance >= 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {friend.balance >= 0 ? '+' : ''}{formatCurrency(friend.balance, friend.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 0 },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  twoColumnLeft: { flex: 1 },
  twoColumnRight: { flex: 1 },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  friendBalance: {
    fontSize: 15,
    fontWeight: '600',
  },
});
