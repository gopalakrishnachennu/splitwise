import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Expense } from '@/types';
import { useThemeColors } from '@/utils/hooks';
import { formatCurrency } from '@/constants/Currencies';
import { getCategoryInfo } from '@/constants/Categories';

interface ExpenseCardProps {
  expense: Expense;
  currentUserId: string;
  onPress?: () => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, currentUserId, onPress }) => {
  const colors = useThemeColors();
  const category = getCategoryInfo(expense.category);

  const paidByYou = expense.paidBy.some((p) => p.userId === currentUserId);
  const yourSplit = expense.splitBetween.find((s) => s.userId === currentUserId);
  const yourPaid = expense.paidBy.find((p) => p.userId === currentUserId);

  let netAmount = 0;
  if (yourPaid) netAmount += yourPaid.amount;
  if (yourSplit) netAmount -= yourSplit.amount;

  const isPositive = netAmount > 0;
  const payerNames = expense.paidBy.map((p) =>
    p.userId === currentUserId ? 'You' : p.userName.split(' ')[0]
  ).join(', ');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
        <MaterialIcons name={category.icon as any} size={22} color={category.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {expense.description}
        </Text>
        <Text style={[styles.payer, { color: colors.textSecondary }]}>
          {payerNames} paid {formatCurrency(expense.amount, expense.currency)}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {format(new Date(expense.date), 'MMM d')}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        {netAmount !== 0 ? (
          <>
            <Text style={[styles.amountLabel, { color: isPositive ? colors.positive : colors.negative }]}>
              {isPositive ? 'you lent' : 'you owe'}
            </Text>
            <Text style={[styles.amount, { color: isPositive ? colors.positive : colors.negative }]}>
              {formatCurrency(Math.abs(netAmount), expense.currency)}
            </Text>
          </>
        ) : (
          <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>
            not involved
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
  },
  payer: {
    fontSize: 13,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
});
