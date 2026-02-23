import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/constants/Currencies';

export default function SettleUpScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { friends } = useFriendStore();
  const { createSettlement } = useExpenseStore();

  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 500 : width;

  const friend = friends.find((f) => f.id === selectedFriend);

  const handleSettle = async () => {
    if (!friend || !user) return;
    const settleAmount = parseFloat(amount);
    if (!settleAmount || settleAmount <= 0) {
      haptic.error();
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await createSettlement({
        fromUserId: user.id,
        fromUserName: user.name,
        toUserId: friend.friendId,
        toUserName: friend.friendName,
        amount: settleAmount,
        currency: friend.currency,
        date: new Date().toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      }, user.name);

      haptic.success();
      Alert.alert('Success', 'Settlement recorded!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        isWide && { alignSelf: 'center', width: contentMaxWidth },
      ]}
    >
      <View style={[styles.illustration, { backgroundColor: colors.primary + '10' }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <MaterialIcons name="handshake" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.illustrationTitle, { color: colors.text }]}>Settle Up</Text>
        <Text style={[styles.illustrationSub, { color: colors.textSecondary }]}>
          Record a payment to settle your balance
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Pay to</Text>
        {friends.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.friendOption,
              {
                backgroundColor: selectedFriend === f.id ? colors.primary + '12' : colors.surface,
                borderColor: selectedFriend === f.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              haptic.selection();
              setSelectedFriend(f.id);
              if (f.balance < 0) setAmount(Math.abs(f.balance).toFixed(2));
            }}
          >
            <Avatar name={f.friendName} size={40} />
            <View style={styles.friendOptionInfo}>
              <Text style={[styles.friendOptionName, { color: colors.text }]}>{f.friendName}</Text>
              <Text style={[
                styles.friendOptionBalance,
                { color: f.balance >= 0 ? colors.positive : colors.negative },
              ]}>
                {f.balance >= 0 ? 'owes you' : 'you owe'} {formatCurrency(Math.abs(f.balance), f.currency)}
              </Text>
            </View>
            <MaterialIcons
              name={selectedFriend === f.id ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={22}
              color={selectedFriend === f.id ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
        ))}

        {selectedFriend && (
          <View style={styles.amountSection}>
            <Input
              label="Amount"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              prefix="$"
              leftIcon="attach-money"
            />
            <Input
              label="Notes (optional)"
              placeholder="e.g. Venmo, Cash, etc."
              value={notes}
              onChangeText={setNotes}
              leftIcon="notes"
            />
            <Button
              title="Record Payment"
              onPress={handleSettle}
              loading={loading}
              fullWidth
              size="large"
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  illustration: {
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationTitle: { fontSize: 24, fontWeight: '800', marginTop: 16 },
  illustrationSub: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  form: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  friendOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
  friendOptionInfo: { flex: 1 },
  friendOptionName: { fontSize: 15, fontWeight: '600' },
  friendOptionBalance: { fontSize: 13, marginTop: 2 },
  amountSection: { marginTop: 20 },
});
