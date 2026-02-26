import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, useWindowDimensions, Modal, Pressable, TextInput,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useGroupStore } from '@/stores/useGroupStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/constants/Currencies';
import { sanitizeDecimalInput } from '@/utils/validation';
import { Balance, DebtSimplification, GroupDefaultSplitType } from '@/types';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { currentGroup, fetchGroup, balances, debts, fetchBalances, deleteGroup, addMember, removeMember } = useGroupStore();
  const { expenses, fetchExpenses } = useExpenseStore();
  const { friends, fetchFriends } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState<string | null>(null);
  const [addMemberError, setAddMemberError] = useState('');
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [showDefaultSplitModal, setShowDefaultSplitModal] = useState(false);
  const [defaultSplitType, setDefaultSplitType] = useState<GroupDefaultSplitType>('equal');
  const [defaultSplitValues, setDefaultSplitValues] = useState<Record<string, string>>({});

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 800 : width;

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    await Promise.all([
      fetchGroup(id),
      fetchExpenses(id),
      fetchBalances(id, user.id),
      fetchFriends(user.id),
    ]);
  }, [id, user, fetchFriends]);

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
  const memberIds = new Set(currentGroup.members.map((m) => m.userId));
  const friendsNotInGroup = friends.filter(
    (f) => (f.status ?? 'linked') === 'linked' && !memberIds.has(f.friendId)
  );

  useEffect(() => {
    if (!currentGroup) return;
    setDefaultSplitType(currentGroup.defaultSplitType ?? 'equal');
    const values: Record<string, string> = {};
    if (currentGroup.defaultSplitConfig) {
      currentGroup.members.forEach((m) => {
        const v = currentGroup.defaultSplitConfig?.[m.userId];
        if (v != null) values[m.userId] = String(v);
      });
    }
    setDefaultSplitValues(values);
  }, [currentGroup?.id]);

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
              <View style={[styles.membersHeader, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MEMBERS</Text>
                <TouchableOpacity
                  style={[styles.addMemberBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { haptic.light(); setShowAddMember(true); }}
                >
                  <MaterialIcons name="person-add" size={18} color="#FFF" />
                  <Text style={styles.addMemberBtnText}>Add member</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.defaultSplitRow, { borderBottomColor: colors.borderLight }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.defaultSplitTitle, { color: colors.text }]}>Default split</Text>
                  <Text style={[styles.defaultSplitSub, { color: colors.textSecondary }]}>
                    {currentGroup.defaultSplitType
                      ? currentGroup.defaultSplitType === 'equal'
                        ? 'Split equally by default'
                        : `Use ${currentGroup.defaultSplitType} ratios`
                      : 'No default split (equal by amount)'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.defaultSplitBtn, { borderColor: colors.border }]}
                  onPress={() => { haptic.light(); setShowDefaultSplitModal(true); }}
                >
                  <MaterialIcons name="tune" size={18} color={colors.textSecondary} />
                  <Text style={[styles.defaultSplitBtnText, { color: colors.textSecondary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              {currentGroup.members.map((member) => (
                <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}>
                  <Avatar name={member.name} size={44} />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.userId === user?.id ? `${member.name} (You)` : member.name}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textTertiary }]}>{member.email}</Text>
                  </View>
                  {member.userId !== user?.id && (
                    <TouchableOpacity
                      style={[styles.removeMemberBtn, { backgroundColor: colors.error + '20' }]}
                      onPress={() => {
                        haptic.warning();
                        Alert.alert('Remove member', `Remove ${member.name} from the group?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              setRemoveLoading(member.id);
                              await removeMember(id!, member.id);
                              setRemoveLoading(null);
                            },
                          },
                        ]);
                      }}
                      disabled={removeLoading === member.id}
                    >
                      <MaterialIcons name="person-remove" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <Modal visible={showAddMember} transparent animationType="slide">
                <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowAddMember(false)}>
                  <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>Add member</Text>
                      <TouchableOpacity onPress={() => { setShowAddMember(false); setAddMemberError(''); }}>
                        <MaterialIcons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                      {addMemberError ? (
                        <View style={[styles.addMemberError, { backgroundColor: colors.error + '18' }]}>
                          <MaterialIcons name="error-outline" size={18} color={colors.error} />
                          <Text style={[styles.addMemberErrorText, { color: colors.error }]}>{addMemberError}</Text>
                        </View>
                      ) : null}
                      {friendsNotInGroup.length === 0 ? (
                        <Text style={[styles.modalEmpty, { color: colors.textSecondary }]}>
                          No friends left to add. Add friends from the Friends tab first.
                        </Text>
                      ) : (
                        friendsNotInGroup.map((friend) => (
                          <TouchableOpacity
                            key={friend.id}
                            style={[styles.friendOption, { borderBottomColor: colors.borderLight }]}
                            onPress={async () => {
                              setAddMemberError('');
                              setAddMemberLoading(friend.id);
                              try {
                                await addMember(id!, { userId: friend.friendId, name: friend.friendName, email: friend.friendEmail });
                                setShowAddMember(false);
                              } catch (e: any) {
                                const msg = e?.message ?? '';
                                setAddMemberError(msg.includes('already') ? 'This person is already in the group.' : 'Could not add member. Try again.');
                              } finally {
                                setAddMemberLoading(null);
                              }
                            }}
                            disabled={addMemberLoading !== null}
                          >
                            <Avatar name={friend.friendName} size={40} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.friendOptionName, { color: colors.text }]}>{friend.friendName}</Text>
                              <Text style={[styles.friendOptionEmail, { color: colors.textTertiary }]}>{friend.friendEmail}</Text>
                            </View>
                            {addMemberLoading === friend.id ? (
                              <Text style={{ color: colors.textTertiary }}>Adding...</Text>
                            ) : (
                              <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </Pressable>
                </Pressable>
              </Modal>

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

      {/* Default split modal */}
      <Modal visible={showDefaultSplitModal} animationType="slide" transparent>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowDefaultSplitModal(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDefaultSplitModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Default split</Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!id || !currentGroup) return;
                  const cfg: Record<string, number> = {};
                  if (defaultSplitType === 'percentage' || defaultSplitType === 'shares') {
                    currentGroup.members.forEach((m) => {
                      const raw = defaultSplitValues[m.userId];
                      const num = parseFloat(raw || '0');
                      if (!Number.isNaN(num) && num > 0) cfg[m.userId] = num;
                    });
                  }
                  await updateGroup(id as string, {
                    defaultSplitType: defaultSplitType === 'equal' ? undefined : defaultSplitType,
                    defaultSplitConfig: Object.keys(cfg).length ? cfg : undefined,
                  });
                  setShowDefaultSplitModal(false);
                }}
              >
                <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.defaultSplitHint, { color: colors.textSecondary }]}>
                Choose how this group should split new expenses by default. You can always override on a specific expense.
              </Text>

              <View style={styles.defaultSplitTypeRow}>
                {(['equal', 'percentage', 'shares'] as GroupDefaultSplitType[]).map((t) => {
                  const selected = defaultSplitType === t;
                  const label =
                    t === 'equal'
                      ? 'Equal'
                      : t === 'percentage'
                        ? 'By percentage'
                        : 'By shares';
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.defaultSplitTypePill,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primaryLight : colors.surface,
                        },
                      ]}
                      onPress={() => {
                        haptic.selection();
                        setDefaultSplitType(t);
                      }}
                    >
                      <Text
                        style={[
                          styles.defaultSplitTypeText,
                          { color: selected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {(defaultSplitType === 'percentage' || defaultSplitType === 'shares') && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {defaultSplitType === 'percentage'
                      ? 'Percentages (should sum to 100%)'
                      : 'Shares (relative weights)'}
                  </Text>
                  {currentGroup.members.map((member) => (
                    <View
                      key={member.userId}
                      style={[styles.defaultSplitMemberRow, { borderBottomColor: colors.borderLight }]}
                    >
                      <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <TextInput
                        style={[styles.defaultSplitInput, { color: colors.text, borderColor: colors.border }]}
                        placeholder={defaultSplitType === 'percentage' ? '0%' : '1'}
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                        value={defaultSplitValues[member.userId] || ''}
                        onChangeText={(t) =>
                          setDefaultSplitValues((prev) => ({ ...prev, [member.userId]: sanitizeDecimalInput(t) }))
                        }
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 0.5,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  addMemberBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  defaultSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  defaultSplitTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  defaultSplitSub: {
    fontSize: 13,
  },
  defaultSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  defaultSplitBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
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
  removeMemberBtn: { padding: 8, borderRadius: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16, maxHeight: 400 },
  modalEmpty: { fontSize: 14, lineHeight: 20 },
  addMemberError: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  addMemberErrorText: { flex: 1, fontSize: 14 },
  friendOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  friendOptionName: { fontSize: 16, fontWeight: '600' },
  friendOptionEmail: { fontSize: 13, marginTop: 2 },
  defaultSplitHint: { fontSize: 13, marginBottom: 12 },
  defaultSplitTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  defaultSplitTypePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  defaultSplitTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  defaultSplitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  defaultSplitInput: {
    width: 80,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
});
