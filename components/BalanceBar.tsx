import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/utils/hooks';
import { formatCurrency } from '@/constants/Currencies';

interface BalanceBarProps {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
  currency?: string;
}

export const BalanceBar: React.FC<BalanceBarProps> = ({
  totalBalance, youOwe, youAreOwed, currency = 'USD',
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.column}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>total balance</Text>
        <Text
          style={[
            styles.amount,
            {
              color: totalBalance > 0 ? colors.positive : totalBalance < 0 ? colors.negative : colors.textTertiary,
            },
          ]}
        >
          {totalBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalBalance), currency)}
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.column}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>you owe</Text>
        <Text style={[styles.amount, { color: youOwe > 0 ? colors.negative : colors.textTertiary }]}>
          {formatCurrency(youOwe, currency)}
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.column}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>you are owed</Text>
        <Text style={[styles.amount, { color: youAreOwed > 0 ? colors.positive : colors.textTertiary }]}>
          {formatCurrency(youAreOwed, currency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '100%',
    marginHorizontal: 4,
  },
});
