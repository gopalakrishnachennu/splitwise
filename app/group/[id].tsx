import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useGroupStore } from '@/stores/useGroupStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/constants/Currencies';
import { Balance, DebtSimplification } from '@/types';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { currentGroup, fetchGroup, balances, debts, fetchBalances, deleteGroup } = useGroupStore();
  const { expenses, fetchExpenses } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 800 : width;

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    await Promise.all([
      fetchGroup(id),
      fetchExpenses(id),
      fetchBalances(id, user.id),
    ]);
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = () => {
    haptic.warning();
    Alert.alert('Delete Group', 'This will delete the group and all its expenses.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          haptic.heavy();
          if (id) await deleteGroup(id);
          router.back();
        },
      },
    ]);
  };

  if (!currentGroup) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const groupExpenses = expenses.filter((e) => e.groupId === id);
  const myBalance = balances.find((b) => b.userId === user?.id);
  const totalSpent = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

  const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
    <TouchableOpacity
      style={[
        styles.tabBtn,
        {
          borderBottomColor: activeTab === tab ? colors.primary : 'transparent',
          borderBottomWidth: activeTab === tab ? 2 : 0,
        },
      ]}
      onPress={() => { haptic.light(); setActiveTab(tab); }}
    >
      <Text style={[styles.tabBtnText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: currentGroup.name }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={isWide ? { alignSelf: 'center', width: contentMaxWidth } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.header, { backgroundColor: colors.primary + '10' }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.groupName, { color: colors.text }]}>{currentGroup.name}</Text>
              <Text style={[styles.groupSub, { color: colors.textSecondary }]}>
                {currentGroup.members.length} members · Total spent: {formatCurrency(totalSpent, currentGroup.defaultCurrency)}
              </Text>
            </View>
          </View>

          {myBalance && (
            <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your balance</Text>
              <Text style={[
                styles.balanceAmount,
                { color: myBalance.amount >= 0 ? colors.positive : colors.negative },
              ]}>
                {myBalance.amount >= 0 ? '+' : ''}{formatCurrency(myBalance.amount, currentGroup.defaultCurrency)}
              </Text>
              <Text style={[styles.balanceDesc, { color: colors.textTertiary }]}>
                {myBalance.amount > 0 ? 'You are owed' : myBalance.amount < 0 ? 'You owe' : 'All settled up'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title="Add Expense"
            onPress={() => router.push('/expense/add')}
            size="small"
            icon={<MaterialIcons name="add" size={18} color="#FFF" />}
            style={{ flex: 1 }}
          />
          <Button
            title="Settle Up"
            onPress={() => router.push('/settle-up')}
            variant="outline"
            size="small"
            icon={<MaterialIcons name="handshake" size={18} color={colors.primary} />}
            style={{ flex: 1 }}
          />
        </View>

        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          <TabButton tab="expenses" label="Expenses" />
          <TabButton tab="balances" label="Balances" />
          <TabButton tab="members" label="Members" />
        </View>

        <View style={styles.content}>
          {activeTab === 'expenses' && (
            groupExpenses.length > 0 ? (
              groupExpenses.map((expense) => (
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
                subtitle="Add the first expense to this group"
                actionTitle="Add Expense"
                onAction={() => router.push('/expense/add')}
              />
            )
          )}

          {activeTab === 'balances' && (
            <View>
              {debts.length > 0 ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    SIMPLIFIED DEBTS
                  </Text>
                  {debts.map((debt, idx) => (
                    <View key={idx} style={[styles.debtRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                      <Avatar name={debt.fromName} size={36} />
                      <View style={styles.debtInfo}>
                        <Text style={[styles.debtText, { color: colors.text }]}>
                          <Text style={styles.debtBold}>{debt.from === user?.id ? 'You' : debt.fromName}</Text>
                          {' owes '}
                          <Text style={styles.debtBold}>{debt.to === user?.id ? 'you' : debt.toName}</Text>
                        </Text>
                        <Text style={[styles.debtAmount, { color: colors.negative }]}>
                          {formatCurrency(debt.amount, debt.currency)}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={16} color={colors.textTertiary} />
                      <Avatar name={debt.toName} size={36} />
                    </View>
                  ))}
                </>
              ) : (
                <EmptyState
                  icon="check-circle"
                  title="All settled up!"
                  subtitle="No outstanding balances in this group"
                />
              )}

              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
                ALL BALANCES
              </Text>
              {balances.map((balance) => (
                <View key={balance.userId} style={[styles.balanceRow, { borderBottomColor: colors.borderLight }]}>
                  <Avatar name={balance.userName} size={32} />
                  <Text style={[styles.balanceName, { color: colors.text }]}>
                    {balance.userId === user?.id ? 'You' : balance.userName}
                  </Text>
                  <Text style={[
                    styles.balanceRowAmount,
                    { color: balance.amount >= 0 ? colors.positive : colors.negative },
                  ]}>
                    {balance.amount >= 0 ? '+' : ''}{formatCurrency(balance.amount, currentGroup.defaultCurrency)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'members' && (
            <View>
              {currentGroup.members.map((member) => (
                <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}>
                  <Avatar name={member.name} size={44} />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.userId === user?.id ? `${member.name} (You)` : member.name}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textTertiary }]}>{member.email}</Text>
                  </View>
                </View>
              ))}

              <Button
                title="Delete Group"
                onPress={handleDelete}
                variant="danger"
                fullWidth
                style={{ marginTop: 24 }}
                icon={<MaterialIcons name="delete" size={18} color="#FFF" />}
              />
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupName: { fontSize: 24, fontWeight: '800' },
  groupSub: { fontSize: 13, marginTop: 4 },
  balanceCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 12, fontWeight: '500' },
  balanceAmount: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  balanceDesc: { fontSize: 13, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginVertical: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabBtnText: { fontSize: 14, fontWeight: '600' },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  debtInfo: { flex: 1 },
  debtText: { fontSize: 14 },
  debtBold: { fontWeight: '700' },
  debtAmount: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  balanceName: { flex: 1, fontSize: 15, fontWeight: '500' },
  balanceRowAmount: { fontSize: 16, fontWeight: '700' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberEmail: { fontSize: 13, marginTop: 2 },
});
