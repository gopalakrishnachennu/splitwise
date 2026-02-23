import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGroupStore } from '@/stores/useGroupStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { CATEGORIES, getCategoryInfo } from '@/constants/Categories';
import { SplitType, ExpensePayer, ExpenseSplit, GroupMember } from '@/types';

export default function AddExpenseScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups } = useGroupStore();
  const { createExpense } = useExpenseStore();
  const { friends } = useFriendStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [category, setCategory] = useState<string>('general');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 600 : width;

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    if (selectedGroupId) {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) setSelectedMembers(group.members);
    } else if (user) {
      setSelectedMembers([{ id: 'self', userId: user.id, name: user.name, email: user.email || '' }]);
    }
  }, [selectedGroupId, groups, user]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const categoryInfo = getCategoryInfo(category as any);

  const calculateSplits = (): ExpenseSplit[] => {
    const totalAmount = parseFloat(amount) || 0;
    const members = selectedMembers;

    switch (splitType) {
      case 'equal': {
        const perPerson = Math.round((totalAmount / members.length) * 100) / 100;
        return members.map((m) => ({
          userId: m.userId,
          userName: m.name,
          amount: perPerson,
        }));
      }
      case 'exact': {
        return members.map((m) => ({
          userId: m.userId,
          userName: m.name,
          amount: parseFloat(customSplits[m.userId] || '0'),
        }));
      }
      case 'percentage': {
        return members.map((m) => {
          const pct = parseFloat(customSplits[m.userId] || '0');
          return {
            userId: m.userId,
            userName: m.name,
            amount: Math.round((totalAmount * pct / 100) * 100) / 100,
            percentage: pct,
          };
        });
      }
      case 'shares': {
        const totalShares = members.reduce(
          (sum, m) => sum + (parseFloat(customShares[m.userId] || '1')), 0
        );
        return members.map((m) => {
          const shares = parseFloat(customShares[m.userId] || '1');
          return {
            userId: m.userId,
            userName: m.name,
            amount: Math.round((totalAmount * shares / totalShares) * 100) / 100,
            shares,
          };
        });
      }
    }
  };

  const handleSave = async () => {
    if (!description.trim()) { haptic.error(); Alert.alert('Error', 'Please enter a description'); return; }
    if (!amount || parseFloat(amount) <= 0) { haptic.error(); Alert.alert('Error', 'Please enter a valid amount'); return; }
    if (!user) return;

    setLoading(true);
    try {
      const totalAmount = parseFloat(amount);
      const paidBy: ExpensePayer[] = [{ userId: user.id, userName: user.name, amount: totalAmount }];
      const splitBetween = calculateSplits();

      haptic.success();
      await createExpense({
        groupId: selectedGroupId,
        description: description.trim(),
        amount: totalAmount,
        currency: user.defaultCurrency || 'USD',
        category: category as any,
        paidBy,
        splitBetween,
        splitType,
        date,
        notes: notes.trim() || undefined,
        isRecurring: false,
        createdBy: user.id,
      }, user.name);

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const SplitTypeButton = ({ type, label, icon }: { type: SplitType; label: string; icon: string }) => (
    <TouchableOpacity
      style={[
        styles.splitTypeBtn,
        {
          backgroundColor: splitType === type ? colors.primary : colors.surface,
          borderColor: splitType === type ? colors.primary : colors.border,
        },
      ]}
      onPress={() => { haptic.selection(); setSplitType(type); }}
    >
      <MaterialIcons
        name={icon as any}
        size={18}
        color={splitType === type ? '#FFF' : colors.textSecondary}
      />
      <Text style={[
        styles.splitTypeBtnText,
        { color: splitType === type ? '#FFF' : colors.textSecondary },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && { alignSelf: 'center', width: contentMaxWidth },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.amountSection, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.amountLabel, { color: colors.primary }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: colors.primary }]}>$</Text>
            <Input
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
          </View>
        </View>

        <View style={styles.form}>
          <Input
            label="Description"
            placeholder="What was it for?"
            value={description}
            onChangeText={setDescription}
            leftIcon="description"
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Group</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowGroups(!showGroups)}
          >
            <MaterialIcons name="group" size={20} color={colors.textSecondary} />
            <Text style={[styles.selectorText, { color: selectedGroup ? colors.text : colors.textTertiary }]}>
              {selectedGroup?.name || 'No group (individual)'}
            </Text>
            <MaterialIcons name="expand-more" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
          {showGroups && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.dropdownItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => { setSelectedGroupId(undefined); setShowGroups(false); }}
              >
                <Text style={[styles.dropdownText, { color: colors.text }]}>No group</Text>
              </TouchableOpacity>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.dropdownItem, { borderBottomColor: colors.borderLight }]}
                  onPress={() => { setSelectedGroupId(g.id); setShowGroups(false); }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{g.name}</Text>
                  <Text style={[styles.dropdownSub, { color: colors.textTertiary }]}>
                    {g.members.length} members
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowCategories(!showCategories)}
          >
            <MaterialIcons name={categoryInfo.icon as any} size={20} color={categoryInfo.color} />
            <Text style={[styles.selectorText, { color: colors.text }]}>{categoryInfo.label}</Text>
            <MaterialIcons name="expand-more" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
          {showCategories && (
            <View style={[styles.categoryGrid]}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: category === cat.key ? cat.color + '20' : colors.surface,
                      borderColor: category === cat.key ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => { setCategory(cat.key); setShowCategories(false); }}
                >
                  <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
                  <Text style={[styles.categoryChipText, { color: category === cat.key ? cat.color : colors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input
            label="Date"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            leftIcon="calendar-today"
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Split Type</Text>
          <View style={styles.splitTypeRow}>
            <SplitTypeButton type="equal" label="Equal" icon="drag-handle" />
            <SplitTypeButton type="exact" label="Exact" icon="pin" />
            <SplitTypeButton type="percentage" label="%" icon="percent" />
            <SplitTypeButton type="shares" label="Shares" icon="pie-chart" />
          </View>

          {selectedMembers.length > 0 && (
            <View style={styles.membersSection}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Split between ({selectedMembers.length} people)
              </Text>
              {selectedMembers.map((member) => {
                const totalAmount = parseFloat(amount) || 0;
                const perPerson = splitType === 'equal'
                  ? (totalAmount / selectedMembers.length).toFixed(2)
                  : (customSplits[member.userId] || '0');

                return (
                  <View key={member.userId} style={[styles.memberSplitRow, { borderBottomColor: colors.borderLight }]}>
                    <Avatar name={member.name} size={32} />
                    <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                      {member.userId === user?.id ? 'You' : member.name}
                    </Text>
                    {splitType === 'equal' ? (
                      <Text style={[styles.memberAmount, { color: colors.primary }]}>
                        ${perPerson}
                      </Text>
                    ) : splitType === 'shares' ? (
                      <Input
                        placeholder="1"
                        value={customShares[member.userId] || ''}
                        onChangeText={(v) => setCustomShares({ ...customShares, [member.userId]: v })}
                        keyboardType="decimal-pad"
                        containerStyle={styles.splitInput}
                        style={{ textAlign: 'right' }}
                      />
                    ) : (
                      <Input
                        placeholder="0.00"
                        value={customSplits[member.userId] || ''}
                        onChangeText={(v) => setCustomSplits({ ...customSplits, [member.userId]: v })}
                        keyboardType="decimal-pad"
                        prefix={splitType === 'percentage' ? '%' : '$'}
                        containerStyle={styles.splitInput}
                        style={{ textAlign: 'right' }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <Input
            label="Notes (optional)"
            placeholder="Add any notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            leftIcon="notes"
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={isWide ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined}>
          <Button
            title="Save Expense"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="large"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  amountSection: {
    padding: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 300,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  form: { padding: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 4,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: -8,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 0.5,
  },
  dropdownText: { fontSize: 15 },
  dropdownSub: { fontSize: 12, marginTop: 2 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: { fontSize: 13, fontWeight: '500' },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  splitTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  splitTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  membersSection: { marginBottom: 16 },
  memberSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  memberAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  splitInput: {
    width: 100,
    marginBottom: 0,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
});
