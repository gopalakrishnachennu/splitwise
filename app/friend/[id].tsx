import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ExpenseCard } from '@/components/ExpenseCard';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/constants/Currencies';

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { friends, removeFriend } = useFriendStore();
  const { expenses, fetchExpenses } = useExpenseStore();

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 600 : width;

  const friend = friends.find((f) => f.id === id);

  useEffect(() => { fetchExpenses(); }, []);

  if (!friend) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Friend not found</Text>
      </View>
    );
  }

  const friendExpenses = expenses.filter((e) =>
    e.paidBy.some((p) => p.userId === friend.friendId) ||
    e.splitBetween.some((s) => s.userId === friend.friendId)
  );

  const handleRemove = () => {
    haptic.warning();
    Alert.alert('Remove Friend', `Remove ${friend.friendName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { haptic.heavy(); await removeFriend(friend.id); router.back(); },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: friend.friendName }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={isWide ? { alignSelf: 'center', width: contentMaxWidth } : undefined}
      >
        <View style={[styles.header, { backgroundColor: colors.primary + '08' }]}>
          <Avatar name={friend.friendName} size={80} />
          <Text style={[styles.name, { color: colors.text }]}>{friend.friendName}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{friend.friendEmail}</Text>

          <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Balance</Text>
            <Text style={[
              styles.balanceAmount,
              { color: friend.balance >= 0 ? colors.positive : colors.negative },
            ]}>
              {friend.balance >= 0 ? '+' : ''}{formatCurrency(friend.balance, friend.currency)}
            </Text>
            <Text style={[styles.balanceSub, { color: colors.textTertiary }]}>
              {friend.balance > 0
                ? `${friend.friendName.split(' ')[0]} owes you`
                : friend.balance < 0
                ? `You owe ${friend.friendName.split(' ')[0]}`
                : 'All settled up'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Settle Up"
            onPress={() => router.push('/settle-up')}
            size="small"
            style={{ flex: 1 }}
            icon={<MaterialIcons name="handshake" size={18} color="#FFF" />}
          />
          <Button
            title="Add Expense"
            onPress={() => router.push('/expense/add')}
            variant="outline"
            size="small"
            style={{ flex: 1 }}
            icon={<MaterialIcons name="add" size={18} color={colors.primary} />}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shared Expenses</Text>
          {friendExpenses.length > 0 ? (
            friendExpenses.map((expense) => (
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
              title="No shared expenses"
              subtitle={`Start sharing expenses with ${friend.friendName.split(' ')[0]}`}
            />
          )}
        </View>

        <View style={styles.section}>
          <Button
            title="Remove Friend"
            onPress={handleRemove}
            variant="danger"
            fullWidth
            icon={<MaterialIcons name="person-remove" size={18} color="#FFF" />}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', padding: 28 },
  name: { fontSize: 24, fontWeight: '800', marginTop: 16 },
  email: { fontSize: 14, marginTop: 4 },
  balanceCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  balanceLabel: { fontSize: 13, fontWeight: '500' },
  balanceAmount: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  balanceSub: { fontSize: 14, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginVertical: 12,
  },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
