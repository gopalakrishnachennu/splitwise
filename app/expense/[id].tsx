import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/constants/Currencies';
import { getCategoryInfo } from '@/constants/Categories';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { currentExpense, fetchExpense, deleteExpense } = useExpenseStore();

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 600 : width;

  useEffect(() => {
    if (id) fetchExpense(id);
  }, [id]);

  if (!currentExpense) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  const category = getCategoryInfo(currentExpense.category);
  const handleDelete = () => {
    haptic.warning();
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptic.heavy();
            await deleteExpense(currentExpense.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={isWide ? { alignSelf: 'center', width: contentMaxWidth } : undefined}
    >
      <View style={[styles.header, { backgroundColor: category.color + '12' }]}>
        <View style={[styles.categoryCircle, { backgroundColor: category.color + '25' }]}>
          <MaterialIcons name={category.icon as any} size={32} color={category.color} />
        </View>
        <Text style={[styles.description, { color: colors.text }]}>{currentExpense.description}</Text>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(currentExpense.amount, currentExpense.currency)}
        </Text>
        <View style={[styles.dateBadge, { backgroundColor: colors.background + 'CC' }]}>
          <MaterialIcons name="calendar-today" size={14} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {format(new Date(currentExpense.date), 'MMMM d, yyyy')}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PAID BY</Text>
          {currentExpense.paidBy.map((payer) => (
            <View key={payer.userId} style={[styles.personRow, { borderBottomColor: colors.borderLight }]}>
              <Avatar name={payer.userName} size={36} />
              <Text style={[styles.personName, { color: colors.text }]}>
                {payer.userId === user?.id ? 'You' : payer.userName}
              </Text>
              <Text style={[styles.personAmount, { color: colors.positive }]}>
                {formatCurrency(payer.amount, currentExpense.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SPLIT ({currentExpense.splitType.toUpperCase()})
          </Text>
          {currentExpense.splitBetween.map((split) => (
            <View key={split.userId} style={[styles.personRow, { borderBottomColor: colors.borderLight }]}>
              <Avatar name={split.userName} size={36} />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: colors.text }]}>
                  {split.userId === user?.id ? 'You' : split.userName}
                </Text>
                {split.percentage != null && (
                  <Text style={[styles.personSub, { color: colors.textTertiary }]}>
                    {split.percentage}%
                  </Text>
                )}
                {split.shares != null && (
                  <Text style={[styles.personSub, { color: colors.textTertiary }]}>
                    {split.shares} shares
                  </Text>
                )}
              </View>
              <Text style={[styles.personAmount, { color: colors.negative }]}>
                {formatCurrency(split.amount, currentExpense.currency)}
              </Text>
            </View>
          ))}
        </View>

        {currentExpense.notes && (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTES</Text>
            <Text style={[styles.notes, { color: colors.text }]}>{currentExpense.notes}</Text>
          </View>
        )}

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DETAILS</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.detailValueRow}>
              <MaterialIcons name={category.icon as any} size={16} color={category.color} />
              <Text style={[styles.detailValue, { color: colors.text }]}>{category.label}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Split type</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{currentExpense.splitType}</Text>
          </View>
          {currentExpense.isRecurring && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Recurring</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {currentExpense.recurringInterval}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Added</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {format(new Date(currentExpense.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
        </View>

        <Button
          title="Delete Expense"
          onPress={handleDelete}
          variant="danger"
          fullWidth
          style={{ marginTop: 8 }}
          icon={<MaterialIcons name="delete" size={18} color="#FFF" />}
        />
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16 },
  header: {
    alignItems: 'center',
    padding: 28,
    paddingTop: 20,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  dateText: { fontSize: 13, fontWeight: '500' },
  body: { padding: 16 },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  personInfo: { flex: 1 },
  personName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  personSub: { fontSize: 12, marginTop: 1 },
  personAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  notes: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 14 },
  detailValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailValue: { fontSize: 14, fontWeight: '500' },
});
