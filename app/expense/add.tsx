import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, Alert, useWindowDimensions,
  Modal, TextInput, Image, Keyboard, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGroupStore } from '@/stores/useGroupStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { sanitizeDecimalInput } from '@/utils/validation';
import { Avatar } from '@/components/Avatar';
import { CATEGORIES, getCategoryInfo } from '@/constants/Categories';
import { CURRENCIES, getCurrencyInfo } from '@/constants/Currencies';
import { getRate } from '@/services/fx';
import { SplitType, ExpensePayer, ExpenseSplit, GroupMember, RecurringInterval } from '@/types';

type SplitTab = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';

const SPLIT_TABS: { key: SplitTab; label: string; icon: string }[] = [
  { key: 'equal', label: '=', icon: 'drag-handle' },
  { key: 'exact', label: '1.23', icon: 'pin' },
  { key: 'percentage', label: '%', icon: 'percent' },
  { key: 'shares', label: 'Shares', icon: 'bar-chart' },
  { key: 'adjustment', label: '+/-', icon: 'add' },
];

const formatDateLabel = (dateStr: string): string => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function AddExpenseScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups } = useGroupStore();
  const { createExpense, updateExpense, fetchExpense, setReceiptScanPrefill } = useExpenseStore();
  const { friends } = useFriendStore();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = typeof params.editId === 'string' ? params.editId : undefined;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [category, setCategory] = useState<string>('general');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitTab, setSplitTab] = useState<SplitTab>('equal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [loading, setLoading] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [currencySearch, setCurrencySearch] = useState('');
  const [payerId, setPayerId] = useState<string | undefined>();

  const descriptionRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);
  const contactInputRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();
  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 500 : width;

  useEffect(() => { fetchGroups(); }, []);

  useFocusEffect(
    useCallback(() => {
      const prefill = useExpenseStore.getState().receiptScanPrefill;
      if (prefill) {
        setDescription(prefill.description);
        setAmount(prefill.amount);
        setReceiptImage(prefill.receiptUri);
        setReceiptScanPrefill(null);
      }
    }, [setReceiptScanPrefill])
  );

  useEffect(() => {
    if (user && !payerId) setPayerId(user.id);
  }, [user]);

  useEffect(() => {
    if (!editId || !user) return;
    let cancelled = false;
    (async () => {
      await fetchExpense(editId);
      if (cancelled) return;
      const expense = useExpenseStore.getState().currentExpense;
      if (!expense) return;
      setDescription(expense.description);
      setAmount(String(expense.amount));
      setSelectedGroupId(expense.groupId ?? undefined);
      setCategory(expense.category);
      setSplitType(expense.splitType);
      setSplitTab(expense.splitType === 'equal' ? 'equal' : expense.splitType === 'exact' ? 'exact' : expense.splitType === 'percentage' ? 'percentage' : expense.splitType === 'shares' ? 'shares' : 'equal');
      setDate(expense.date);
      setNotes(expense.notes ?? '');
      setCurrencyCode(expense.currency || 'USD');
      setReceiptImage(expense.receiptUrl ?? null);
      setIsRecurring(!!expense.isRecurring);
      setRecurringInterval(expense.recurringInterval ?? 'monthly');
      if (expense.paidBy?.[0]) setPayerId(expense.paidBy[0].userId);
      const customSplitsNext: Record<string, string> = {};
      const customSharesNext: Record<string, string> = {};
      expense.splitBetween?.forEach((s) => {
        if (s.percentage != null) customSplitsNext[s.userId] = String(s.percentage);
        else if (s.shares != null) customSharesNext[s.userId] = String(s.shares);
        else customSplitsNext[s.userId] = String(s.amount);
      });
      setCustomSplits(customSplitsNext);
      setCustomShares(customSharesNext);
      await fetchGroups();
      if (cancelled) return;
      if (expense.groupId) {
        const group = useGroupStore.getState().groups.find((g) => g.id === expense.groupId);
        if (group) setSelectedMembers(group.members);
      } else {
        const fromSplit = expense.splitBetween?.map((s) => ({ id: '', userId: s.userId, name: s.userName, email: '' as string })) ?? [];
        if (fromSplit.length) setSelectedMembers(fromSplit);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, user, fetchExpense, fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        setSelectedMembers(group.members);
        if (!editId) setCurrencyCode(group.defaultCurrency || user?.defaultCurrency || 'USD');
      }
    } else if (user) {
      setSelectedMembers([
        { id: 'self', userId: user.id, name: user.name, email: user.email || '' },
      ]);
      if (!editId) setCurrencyCode(user.defaultCurrency || 'USD');
    }
  }, [selectedGroupId, groups, user, editId]);

  // Apply group default split configuration when creating a new expense.
  useEffect(() => {
    if (!selectedGroupId || editId) return;
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group || !group.defaultSplitType || !group.defaultSplitConfig) return;
    const members = group.members;
    if (!members.length) return;

    const type = group.defaultSplitType as SplitType;
    setSplitType(type);
    setSplitTab(type === 'exact' ? 'exact' : type === 'percentage' ? 'percentage' : type === 'shares' ? 'shares' : 'equal');

    if (type === 'percentage') {
      const next: Record<string, string> = {};
      members.forEach((m) => {
        const v = group.defaultSplitConfig?.[m.userId];
        if (v != null) next[m.userId] = String(v);
      });
      setCustomSplits(next);
    } else if (type === 'shares') {
      const nextShares: Record<string, string> = {};
      members.forEach((m) => {
        const v = group.defaultSplitConfig?.[m.userId];
        if (v != null) nextShares[m.userId] = String(v);
      });
      setCustomShares(nextShares);
    }
  }, [selectedGroupId, groups, editId]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const categoryInfo = getCategoryInfo(category as any);
  const payerName = useMemo(() => {
    if (!payerId || payerId === user?.id) return 'you';
    const m = selectedMembers.find((mem) => mem.userId === payerId);
    return m?.name || 'you';
  }, [payerId, user, selectedMembers]);

  const splitLabel = useMemo(() => {
    switch (splitType) {
      case 'equal': return 'equally';
      case 'exact': return 'by exact amounts';
      case 'percentage': return 'by percentages';
      case 'shares': return 'by shares';
      default: return 'equally';
    }
  }, [splitType]);

  const filteredContacts = useMemo(() => {
    const q = contactQuery.toLowerCase().trim();
    const items: { type: 'group' | 'friend'; id: string; name: string; sub?: string }[] = [];
    groups.forEach((g) => {
      if (!q || g.name.toLowerCase().includes(q)) {
        items.push({ type: 'group', id: g.id, name: g.name, sub: `${g.members.length} people` });
      }
    });
    friends.forEach((f) => {
      if (!q || f.friendName.toLowerCase().includes(q) || (f.friendEmail && f.friendEmail.toLowerCase().includes(q))) {
        items.push({ type: 'friend', id: f.id, name: f.friendName, sub: f.friendEmail });
      }
    });
    return items;
  }, [contactQuery, groups, friends]);

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [currencySearch]);

  const currencyInfo = getCurrencyInfo(currencyCode);

  const calculateSplits = (): ExpenseSplit[] => {
    const totalAmount = parseFloat(amount) || 0;
    const members = selectedMembers;
    if (members.length === 0) return [];

    if (splitTab === 'adjustment') {
      const base = totalAmount / members.length;
      const withAdj = members.map((m) => ({
        userId: m.userId,
        userName: m.name,
        amount: base + (parseFloat(adjustments[m.userId] || '0') || 0),
      }));
      const sum = withAdj.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(sum - totalAmount) > 0.01) {
        const scale = totalAmount / sum;
        return withAdj.map((x) => ({ ...x, amount: Math.round(x.amount * scale * 100) / 100 }));
      }
      return withAdj.map((x) => ({ ...x, amount: Math.round(x.amount * 100) / 100 }));
    }

    switch (splitType) {
      case 'equal': {
        const perPerson = Math.round((totalAmount / members.length) * 100) / 100;
        return members.map((m) => ({ userId: m.userId, userName: m.name, amount: perPerson }));
      }
      case 'exact':
        return members.map((m) => ({
          userId: m.userId, userName: m.name,
          amount: parseFloat(customSplits[m.userId] || '0'),
        }));
      case 'percentage':
        return members.map((m) => {
          const pct = parseFloat(customSplits[m.userId] || '0');
          return {
            userId: m.userId, userName: m.name,
            amount: Math.round((totalAmount * pct / 100) * 100) / 100,
            percentage: pct,
          };
        });
      case 'shares': {
        const totalShares = members.reduce(
          (sum, m) => sum + (parseFloat(customShares[m.userId] || '1')), 0,
        );
        return members.map((m) => {
          const shares = parseFloat(customShares[m.userId] || '1');
          return {
            userId: m.userId, userName: m.name,
            amount: Math.round((totalAmount * shares / totalShares) * 100) / 100,
            shares,
          };
        });
      }
      default:
        return members.map((m) => ({ userId: m.userId, userName: m.name, amount: Math.round((totalAmount / members.length) * 100) / 100 }));
    }
  };

  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Camera access is required.');
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Photo library access is required.');
        return;
      }
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets.length > 0) {
      haptic.success();
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleAddReceipt = () => {
    haptic.light();
    if (Platform.OS === 'web') {
      pickImage(false);
      return;
    }
    Alert.alert('Add Receipt', 'Choose a source', [
      { text: 'Scan receipt (extract items)', onPress: () => router.push('/expense/receipt-scan') },
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Photo Library', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!description.trim()) { haptic.error(); Alert.alert('Error', 'Please enter a description'); return; }
    const amountNum = parseFloat(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      haptic.error();
      Alert.alert('Error', 'Please enter a valid amount (numbers only).');
      return;
    }
    if (!user) return;

    const totalAmount = parseFloat(amount);
    const splitBetween = calculateSplits();
    const splitSum = splitBetween.reduce((s, x) => s + x.amount, 0);
    if (splitTab === 'exact' || splitTab === 'percentage') {
      if (Math.abs(splitSum - totalAmount) > 0.02) {
        haptic.error();
        Alert.alert('Invalid split', `Amounts must add up to ${totalAmount.toFixed(2)}. Current sum: ${splitSum.toFixed(2)}`);
        return;
      }
    }

    setLoading(true);
    try {
      const payer = selectedMembers.find((m) => m.userId === payerId) || { userId: user.id, name: user.name };
      const paidBy: ExpensePayer[] = [{ userId: payer.userId, userName: payer.name, amount: totalAmount }];
      const groupCurrency = selectedGroup ? (selectedGroup.defaultCurrency || 'USD') : (user.defaultCurrency || 'USD');
      let fxToGroupRate: number | undefined;
      let fxUpdatedAt: string | undefined;
      if (currencyCode !== groupCurrency) {
        try {
          const res = await getRate(currencyCode, groupCurrency);
          fxToGroupRate = res.rate;
          fxUpdatedAt = res.updatedAt;
        } catch (e) {
          Alert.alert('Exchange rate unavailable', 'Could not fetch rate for this currency. Try again or use group currency.');
          setLoading(false);
          return;
        }
      }
      const payload = {
        groupId: selectedGroupId,
        description: description.trim(),
        amount: totalAmount,
        currency: currencyCode,
        category: category as any,
        paidBy,
        splitBetween,
        splitType: splitTab === 'adjustment' ? 'equal' as SplitType : splitType,
        date,
        notes: notes.trim() || undefined,
        receiptUrl: receiptImage || undefined,
        isRecurring,
        recurringInterval: isRecurring ? recurringInterval : undefined,
        createdBy: user.id,
        ...(fxToGroupRate != null && { fxToGroupRate, fxUpdatedAt }),
      };

      haptic.success();
      if (editId) {
        const existing = useExpenseStore.getState().currentExpense;
        const updates = { ...payload, createdBy: existing?.createdBy ?? user.id };
        const updated = await updateExpense(editId, updates, user.name);
        if (updated) router.back();
        else Alert.alert('Error', 'Failed to update expense');
      } else {
        await createExpense(payload, user.name);
        router.back();
      }
    } catch {
      Alert.alert('Error', editId ? 'Failed to update expense' : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const selectContact = (item: { type: 'group' | 'friend'; id: string; name: string }) => {
    haptic.selection();
    if (item.type === 'group') {
      setSelectedGroupId(item.id);
    }
    setShowContactSearch(false);
    setContactQuery('');
  };

  const removeGroup = () => {
    haptic.light();
    setSelectedGroupId(undefined);
  };

  const onSplitTabSelect = (tab: SplitTab) => {
    haptic.selection();
    setSplitTab(tab);
    if (tab !== 'adjustment') setSplitType(tab as SplitType);
  };

  const confirmSplit = () => {
    if (splitTab !== 'adjustment') setSplitType(splitTab as SplitType);
    setShowSplitModal(false);
  };

  // -- Renders --

  const renderTopBar = () => (
    <View style={[s.topBar, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={() => router.back()} style={s.topBarBtn} hitSlop={8}>
        <MaterialIcons name="close" size={26} color={colors.text} />
      </TouchableOpacity>
      <Text style={[s.topBarTitle, { color: colors.text }]}>{editId ? 'Edit expense' : 'Add an expense'}</Text>
      <TouchableOpacity onPress={handleSave} style={s.topBarBtn} hitSlop={8} disabled={loading}>
        <Text style={[s.saveText, { color: colors.primary, opacity: loading ? 0.5 : 1 }]}>
          {loading ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWithYouAndSection = () => (
    <View style={[s.withSection, { borderBottomColor: colors.border }]}>
      <Text style={[s.withLabel, { color: colors.textSecondary }]}>With you and: </Text>
      <View style={s.withChipsRow}>
        {selectedGroup && (
          <View style={[s.groupChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <MaterialIcons name="group" size={14} color={colors.primary} />
            <Text style={[s.groupChipText, { color: colors.primary }]} numberOfLines={1}>
              All of {selectedGroup.name}
            </Text>
            <TouchableOpacity onPress={removeGroup} hitSlop={6}>
              <MaterialIcons name="close" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          ref={contactInputRef}
          style={[s.withInput, { color: colors.text }]}
          placeholder={selectedGroup ? 'Add more people' : 'Name, email, or phone'}
          placeholderTextColor={colors.textTertiary}
          value={contactQuery}
          onChangeText={(t) => { setContactQuery(t); setShowContactSearch(true); }}
          onFocus={() => setShowContactSearch(true)}
        />
      </View>
      {showContactSearch && (
        <View style={[s.contactDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }} nestedScrollEnabled>
            {filteredContacts.length === 0 ? (
              <Text style={[s.contactEmpty, { color: colors.textTertiary }]}>No results</Text>
            ) : (
              filteredContacts.map((item) => (
                <TouchableOpacity
                  key={`${item.type}-${item.id}`}
                  style={[s.contactRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => selectContact(item)}
                >
                  <View style={[s.contactIcon, { backgroundColor: item.type === 'group' ? colors.primaryLight : colors.surfaceVariant }]}>
                    <MaterialIcons
                      name={item.type === 'group' ? 'group' : 'person'}
                      size={18}
                      color={item.type === 'group' ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.contactName, { color: colors.text }]}>{item.name}</Text>
                    {item.sub ? <Text style={[s.contactSub, { color: colors.textTertiary }]}>{item.sub}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderCenterInput = () => (
    <View style={s.centerSection}>
      <TouchableOpacity
        style={[s.categoryIconBtn, { backgroundColor: colors.surfaceVariant }]}
        onPress={() => { haptic.light(); setShowCategoryModal(true); }}
      >
        <MaterialIcons name={categoryInfo.icon as any} size={28} color={categoryInfo.color || colors.textTertiary} />
      </TouchableOpacity>

      <TextInput
        ref={descriptionRef}
        style={[s.descInput, { color: colors.text, borderBottomColor: colors.border }]}
        placeholder="Enter a description"
        placeholderTextColor={colors.textTertiary}
        value={description}
        onChangeText={setDescription}
        returnKeyType="next"
        onSubmitEditing={() => amountRef.current?.focus()}
        onFocus={() => setShowContactSearch(false)}
      />

      <View style={[s.amountRow, { borderBottomColor: colors.border }]}>
        <Text style={[s.currencySign, { color: colors.text }]}>{currencyInfo.symbol}</Text>
        <TextInput
          ref={amountRef}
          style={[s.amountInput, { color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.textTertiary}
          value={amount}
          onChangeText={(t) => setAmount(sanitizeDecimalInput(t))}
          keyboardType="decimal-pad"
          onFocus={() => setShowContactSearch(false)}
        />
        <TouchableOpacity
          style={[s.currencyChip, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
          onPress={() => { haptic.light(); setCurrencySearch(''); setShowCurrencyModal(true); }}
        >
          <Text style={[s.currencyChipText, { color: colors.textSecondary }]}>{currencyInfo.flag} {currencyCode}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.paidSplitRow}>
        <Text style={[s.paidSplitText, { color: colors.textSecondary }]}>Paid by </Text>
        <TouchableOpacity
          style={[s.paidSplitChip, { borderColor: colors.primary }]}
          onPress={() => { haptic.light(); setShowPayerModal(true); }}
        >
          <Text style={[s.paidSplitChipText, { color: colors.primary }]}>{payerName}</Text>
        </TouchableOpacity>
        <Text style={[s.paidSplitText, { color: colors.textSecondary }]}> and split </Text>
        <TouchableOpacity
          style={[s.paidSplitChip, { borderColor: colors.primary }]}
          onPress={() => { haptic.light(); setShowSplitModal(true); }}
        >
          <Text style={[s.paidSplitChipText, { color: colors.primary }]}>{splitLabel}</Text>
        </TouchableOpacity>
      </View>

      {receiptImage && (
        <View style={[s.receiptPreview, { borderColor: colors.border }]}>
          <Image source={{ uri: receiptImage }} style={s.receiptImg} resizeMode="cover" />
          <TouchableOpacity
            style={[s.receiptRemoveBtn, { backgroundColor: colors.overlay }]}
            onPress={() => { haptic.light(); setReceiptImage(null); }}
          >
            <MaterialIcons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBottomToolbar = () => (
    <View style={[s.bottomToolbar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[isWide && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' as const }, s.toolbarInner]}>
        <TouchableOpacity style={s.toolbarItem} onPress={() => { haptic.light(); setShowDateModal(true); }}>
          <MaterialIcons name="calendar-today" size={22} color={colors.textSecondary} />
          <Text style={[s.toolbarLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatDateLabel(date)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.toolbarItem} onPress={() => { haptic.light(); setShowRecurringModal(true); }}>
          <MaterialIcons
            name="autorenew"
            size={22}
            color={isRecurring ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              s.toolbarLabel,
              { color: isRecurring ? colors.primary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {isRecurring ? recurringInterval.charAt(0).toUpperCase() + recurringInterval.slice(1) : 'One-time'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.toolbarItem} onPress={() => { haptic.light(); setShowContactSearch(true); contactInputRef.current?.focus(); }}>
          <MaterialIcons name="group" size={22} color={colors.textSecondary} />
          <Text style={[s.toolbarLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {selectedGroup?.name || 'No group'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.toolbarItem} onPress={handleAddReceipt}>
          <MaterialIcons name="camera-alt" size={22} color={receiptImage ? colors.primary : colors.textSecondary} />
          <Text style={[s.toolbarLabel, { color: receiptImage ? colors.primary : colors.textSecondary }]}>
            {receiptImage ? 'Receipt' : 'Camera'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.toolbarItem} onPress={() => { haptic.light(); setShowNotesModal(true); }}>
          <MaterialIcons name="notes" size={22} color={notes ? colors.primary : colors.textSecondary} />
          <Text style={[s.toolbarLabel, { color: notes ? colors.primary : colors.textSecondary }]}>
            {notes ? 'Notes' : 'Notes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // -- Modals --

  const renderPayerModal = () => (
    <Modal visible={showPayerModal} animationType="slide" transparent>
      <Pressable style={[s.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowPayerModal(false)}>
        <Pressable style={[s.modalSheet, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom }]} onPress={(e) => e.stopPropagation()}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPayerModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Who paid?</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={s.modalBody}>
            {selectedMembers.map((member) => {
              const isSelected = payerId === member.userId;
              return (
                <TouchableOpacity
                  key={member.userId}
                  style={[s.payerRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => { haptic.selection(); setPayerId(member.userId); setShowPayerModal(false); }}
                >
                  <Avatar name={member.name} size={36} />
                  <Text style={[s.payerName, { color: colors.text }]}>
                    {member.userId === user?.id ? 'You' : member.name}
                  </Text>
                  {isSelected && <MaterialIcons name="check" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderSplitModal = () => {
    const totalAmount = parseFloat(amount) || 0;
    const splitTotal = (() => {
      switch (splitTab) {
        case 'exact':
          return selectedMembers.reduce((s, m) => s + (parseFloat(customSplits[m.userId] || '0')), 0);
        case 'percentage':
          return selectedMembers.reduce((s, m) => s + (parseFloat(customSplits[m.userId] || '0')), 0);
        case 'shares':
          return selectedMembers.reduce((s, m) => s + (parseFloat(customShares[m.userId] || '1')), 0);
        default:
          return totalAmount;
      }
    })();

    const remaining = splitTab === 'exact'
      ? totalAmount - splitTotal
      : splitTab === 'percentage'
        ? 100 - splitTotal
        : 0;

    return (
      <Modal visible={showSplitModal} animationType="slide" transparent>
        <Pressable style={[s.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowSplitModal(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom }]} onPress={(e) => e.stopPropagation()}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowSplitModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Split options</Text>
              <TouchableOpacity onPress={confirmSplit}>
                <MaterialIcons name="check" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[s.splitTabRow, { borderBottomColor: colors.border }]}>
              {SPLIT_TABS.map((tab) => {
                const active = splitTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.splitTabBtn, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                    onPress={() => onSplitTabSelect(tab.key)}
                  >
                    <Text style={[s.splitTabText, { color: active ? colors.primary : colors.textTertiary }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView style={s.modalBody}>
              {splitTab === 'equal' && (
                <View style={s.splitInfo}>
                  <Text style={[s.splitInfoTitle, { color: colors.text }]}>Split equally</Text>
                  <Text style={[s.splitInfoSub, { color: colors.textSecondary }]}>
                    {totalAmount > 0
                      ? `$${(totalAmount / Math.max(selectedMembers.length, 1)).toFixed(2)}/person`
                      : 'Enter amount above'}
                  </Text>
                  {selectedMembers.map((m) => (
                    <View key={m.userId} style={[s.splitMemberRow, { borderBottomColor: colors.borderLight }]}>
                      <Avatar name={m.name} size={32} />
                      <Text style={[s.splitMemberName, { color: colors.text }]}>
                        {m.userId === user?.id ? 'You' : m.name}
                      </Text>
                      <Text style={[s.splitMemberAmt, { color: colors.primary }]}>
                        ${(totalAmount / Math.max(selectedMembers.length, 1)).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {splitTab === 'exact' && (
                <View style={s.splitInfo}>
                  <Text style={[s.splitInfoTitle, { color: colors.text }]}>Split by exact amounts</Text>
                  {remaining !== 0 && (
                    <Text style={[s.splitRemaining, { color: remaining > 0 ? colors.warning : colors.error }]}>
                      ${Math.abs(remaining).toFixed(2)} {remaining > 0 ? 'left' : 'over'}
                    </Text>
                  )}
                  {selectedMembers.map((m) => (
                    <View key={m.userId} style={[s.splitMemberRow, { borderBottomColor: colors.borderLight }]}>
                      <Avatar name={m.name} size={32} />
                      <Text style={[s.splitMemberName, { color: colors.text }]}>
                        {m.userId === user?.id ? 'You' : m.name}
                      </Text>
                      <View style={[s.splitInputWrap, { borderColor: colors.border }]}>
                        <Text style={{ color: colors.textSecondary }}>$</Text>
                        <TextInput
                          style={[s.splitInputField, { color: colors.text }]}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={colors.textTertiary}
                          value={customSplits[m.userId] || ''}
                          onChangeText={(v) => setCustomSplits({ ...customSplits, [m.userId]: sanitizeDecimalInput(v) })}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {splitTab === 'percentage' && (
                <View style={s.splitInfo}>
                  <Text style={[s.splitInfoTitle, { color: colors.text }]}>Split by percentages</Text>
                  {remaining !== 0 && (
                    <Text style={[s.splitRemaining, { color: remaining > 0 ? colors.warning : colors.error }]}>
                      {Math.abs(remaining).toFixed(1)}% {remaining > 0 ? 'left' : 'over'}
                    </Text>
                  )}
                  {selectedMembers.map((m) => (
                    <View key={m.userId} style={[s.splitMemberRow, { borderBottomColor: colors.borderLight }]}>
                      <Avatar name={m.name} size={32} />
                      <Text style={[s.splitMemberName, { color: colors.text }]}>
                        {m.userId === user?.id ? 'You' : m.name}
                      </Text>
                      <View style={[s.splitInputWrap, { borderColor: colors.border }]}>
                        <TextInput
                          style={[s.splitInputField, { color: colors.text }]}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.textTertiary}
                          value={customSplits[m.userId] || ''}
                          onChangeText={(v) => setCustomSplits({ ...customSplits, [m.userId]: sanitizeDecimalInput(v) })}
                        />
                        <Text style={{ color: colors.textSecondary }}>%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {splitTab === 'shares' && (
                <View style={s.splitInfo}>
                  <Text style={[s.splitInfoTitle, { color: colors.text }]}>Split by shares</Text>
                  <Text style={[s.splitInfoSub, { color: colors.textSecondary }]}>
                    Total: {splitTotal} shares
                  </Text>
                  {selectedMembers.map((m) => (
                    <View key={m.userId} style={[s.splitMemberRow, { borderBottomColor: colors.borderLight }]}>
                      <Avatar name={m.name} size={32} />
                      <Text style={[s.splitMemberName, { color: colors.text }]}>
                        {m.userId === user?.id ? 'You' : m.name}
                      </Text>
                      <View style={[s.splitInputWrap, { borderColor: colors.border }]}>
                        <TextInput
                          style={[s.splitInputField, { color: colors.text }]}
                          keyboardType="number-pad"
                          placeholder="1"
                          placeholderTextColor={colors.textTertiary}
value={customShares[m.userId] || ''}
                          onChangeText={(v) => setCustomShares({ ...customShares, [m.userId]: sanitizeDecimalInput(v) })}
                        />
                        <Text style={{ color: colors.textSecondary }}>shares</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {splitTab === 'adjustment' && (
                <View style={s.splitInfo}>
                  <Text style={[s.splitInfoTitle, { color: colors.text }]}>Adjustments</Text>
                  <Text style={[s.splitInfoSub, { color: colors.textSecondary }]}>
                    Split equally then add/subtract adjustments
                  </Text>
                  {selectedMembers.map((m) => {
                    const base = totalAmount / Math.max(selectedMembers.length, 1);
                    const adj = parseFloat(adjustments[m.userId] || '0');
                    return (
                      <View key={m.userId} style={[s.splitMemberRow, { borderBottomColor: colors.borderLight }]}>
                        <Avatar name={m.name} size={32} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.splitMemberName, { color: colors.text }]}>
                            {m.userId === user?.id ? 'You' : m.name}
                          </Text>
                          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                            ${base.toFixed(2)} {adj !== 0 ? (adj > 0 ? `+ $${adj.toFixed(2)}` : `- $${Math.abs(adj).toFixed(2)}`) : ''}
                          </Text>
                        </View>
                        <View style={[s.splitInputWrap, { borderColor: colors.border }]}>
                          <Text style={{ color: colors.textSecondary }}>+/-</Text>
                          <TextInput
                            style={[s.splitInputField, { color: colors.text }]}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            value={adjustments[m.userId] || ''}
                            onChangeText={(v) => setAdjustments({ ...adjustments, [m.userId]: sanitizeDecimalInput(v, true) })}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderCategoryModal = () => {
    const grouped: Record<string, typeof CATEGORIES> = {};
    const sections = [
      { title: 'Essentials', keys: ['food', 'drinks', 'groceries', 'rent', 'utilities', 'electricity', 'water', 'internet', 'phone'] },
      { title: 'Transport', keys: ['transport', 'fuel', 'parking', 'taxi', 'flight'] },
      { title: 'Lifestyle', keys: ['entertainment', 'movies', 'music', 'sports', 'clothing', 'gifts'] },
      { title: 'Living', keys: ['home', 'insurance', 'medical', 'cleaning', 'maintenance'] },
      { title: 'Other', keys: ['travel', 'hotel', 'education', 'pets', 'electronics', 'subscriptions', 'general', 'other'] },
    ];

    return (
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <Pressable style={[s.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowCategoryModal(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom }]} onPress={(e) => e.stopPropagation()}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Category</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={s.modalBody}>
              {sections.map((sec) => (
                <View key={sec.title}>
                  <Text style={[s.catSectionTitle, { color: colors.textSecondary }]}>{sec.title}</Text>
                  {sec.keys.map((key) => {
                    const cat = CATEGORIES.find((c) => c.key === key);
                    if (!cat) return null;
                    const active = category === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[s.catRow, { backgroundColor: active ? colors.primaryLight : 'transparent' }]}
                        onPress={() => { haptic.selection(); setCategory(cat.key); setShowCategoryModal(false); }}
                      >
                        <View style={[s.catIconWrap, { backgroundColor: cat.color + '20' }]}>
                          <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
                        </View>
                        <Text style={[s.catLabel, { color: colors.text }]}>{cat.label}</Text>
                        {active && <MaterialIcons name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderCurrencyModal = () => (
    <Modal visible={showCurrencyModal} animationType="slide" transparent>
      <Pressable style={[s.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowCurrencyModal(false)}>
        <Pressable style={[s.modalSheet, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom }]} onPress={(e) => e.stopPropagation()}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Expense currency</Text>
            <View style={{ width: 24 }} />
          </View>
          <TextInput
            style={[s.currencySearchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="Search currency..."
            placeholderTextColor={colors.textTertiary}
            value={currencySearch}
            onChangeText={setCurrencySearch}
          />
          <ScrollView style={{ maxHeight: 360 }}>
            {filteredCurrencies.map((c) => {
              const active = currencyCode === c.code;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[s.currencyRow, { backgroundColor: active ? colors.primaryLight : 'transparent' }]}
                  onPress={() => { haptic.selection(); setCurrencyCode(c.code); setShowCurrencyModal(false); }}
                >
                  <Text style={s.currencyRowFlag}>{c.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.currencyRowCode, { color: colors.text }]}>{c.code}</Text>
                    <Text style={[s.currencyRowName, { color: colors.textSecondary }]}>{c.name}</Text>
                  </View>
                  <Text style={[s.currencyRowSymbol, { color: colors.textTertiary }]}>{c.symbol}</Text>
                  {active && <MaterialIcons name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderNotesModal = () => (
    <Modal visible={showNotesModal} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          style={[s.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => { Keyboard.dismiss(); setShowNotesModal(false); }}
        >
          <Pressable
            style={[s.modalSheetSmall, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom || 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowNotesModal(false); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Notes</Text>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowNotesModal(false); }}>
                <Text style={[s.saveText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <TextInput
                style={[s.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                multiline
                placeholder="Add notes about this expense..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                autoFocus
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDateModal = () => (
    <Modal visible={showDateModal} animationType="slide" transparent>
      <Pressable style={[s.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowDateModal(false)}>
        <Pressable style={[s.modalSheetSmall, { backgroundColor: colors.background, maxWidth: contentMaxWidth, paddingBottom: insets.bottom || 16 }]} onPress={(e) => e.stopPropagation()}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDateModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Select date</Text>
            <TouchableOpacity onPress={() => setShowDateModal(false)}>
              <Text style={[s.saveText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <TouchableOpacity
              style={[s.dateQuickBtn, date === new Date().toISOString().split('T')[0] && { backgroundColor: colors.primaryLight, borderColor: colors.primary }, { borderColor: colors.border }]}
              onPress={() => { setDate(new Date().toISOString().split('T')[0]); }}
            >
              <MaterialIcons name="today" size={20} color={colors.primary} />
              <Text style={[s.dateQuickText, { color: colors.text }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.dateQuickBtn, { borderColor: colors.border, marginTop: 8 }]}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setDate(y.toISOString().split('T')[0]);
              }}
            >
              <MaterialIcons name="event" size={20} color={colors.textSecondary} />
              <Text style={[s.dateQuickText, { color: colors.text }]}>Yesterday</Text>
            </TouchableOpacity>
            <View style={s.dateDivider} />
            <Text style={[s.dateLabel, { color: colors.textSecondary }]}>Custom date (YYYY-MM-DD)</Text>
            <TextInput
              style={[s.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderRecurringModal = () => (
    <Modal visible={showRecurringModal} animationType="slide" transparent>
      <Pressable
        style={[s.modalOverlay, { backgroundColor: colors.overlay }]}
        onPress={() => setShowRecurringModal(false)}
      >
        <Pressable
          style={[
            s.modalSheetSmall,
            {
              backgroundColor: colors.background,
              maxWidth: contentMaxWidth,
              paddingBottom: insets.bottom || 16,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowRecurringModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Recurring</Text>
            <TouchableOpacity onPress={() => setShowRecurringModal(false)}>
              <Text style={[s.saveText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <View style={s.recurringRow}>
              <Text style={[s.recurringLabel, { color: colors.text }]}>
                Make this a recurring expense
              </Text>
              <Switch
                value={isRecurring}
                onValueChange={(val) => {
                  haptic.selection();
                  setIsRecurring(val);
                }}
                thumbColor={Platform.OS === 'android' ? (isRecurring ? colors.primary : '#FFF') : undefined}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
              />
            </View>
            {isRecurring && (
              <>
                <Text style={[s.recurringSub, { color: colors.textSecondary }]}>
                  How often should this repeat?
                </Text>
                <View style={s.recurringIntervalRow}>
                  {(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as RecurringInterval[]).map(
                    (interval) => {
                      const selected = recurringInterval === interval;
                      const label =
                        interval === 'biweekly'
                          ? 'Every 2 weeks'
                          : interval.charAt(0).toUpperCase() + interval.slice(1);
                      return (
                        <TouchableOpacity
                          key={interval}
                          style={[
                            s.recurringPill,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primaryLight : colors.surface,
                            },
                          ]}
                          onPress={() => {
                            haptic.selection();
                            setRecurringInterval(interval);
                            setIsRecurring(true);
                          }}
                        >
                          <Text
                            style={[
                              s.recurringPillText,
                              { color: selected ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[s.container, { backgroundColor: colors.background }]}
    >
      <View style={isWide ? { flex: 1, alignSelf: 'center', width: contentMaxWidth } : { flex: 1 }}>
        {renderTopBar()}

        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {renderWithYouAndSection()}
          {renderCenterInput()}
        </ScrollView>

        {renderBottomToolbar()}
      </View>

      {renderPayerModal()}
      {renderSplitModal()}
      {renderCategoryModal()}
      {renderCurrencyModal()}
      {renderNotesModal()}
      {renderDateModal()}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarBtn: { padding: 4, minWidth: 60 },
  topBarTitle: { fontSize: 17, fontWeight: '600' },
  saveText: { fontSize: 16, fontWeight: '600' },

  // With you and
  withSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  withLabel: { fontSize: 15 },
  withChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  groupChipText: { fontSize: 13, fontWeight: '500', maxWidth: 160 },
  withInput: {
    flex: 1,
    fontSize: 15,
    minWidth: 100,
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // Contact dropdown
  contactDropdown: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: { fontSize: 15, fontWeight: '500' },
  contactSub: { fontSize: 12, marginTop: 1 },
  contactEmpty: { padding: 16, textAlign: 'center', fontSize: 14 },

  // Center section
  centerSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
  },
  categoryIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  descInput: {
    fontSize: 18,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  currencySign: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 2,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 80,
    flex: 1,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  currencyChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  currencyChipText: { fontSize: 13, fontWeight: '600' },

  // Currency modal
  currencySearchInput: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  currencyRowFlag: { fontSize: 22 },
  currencyRowCode: { fontSize: 16, fontWeight: '600' },
  currencyRowName: { fontSize: 12, marginTop: 1 },
  currencyRowSymbol: { fontSize: 15 },

  // Paid by / split
  paidSplitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 2,
  },
  paidSplitText: { fontSize: 15 },
  paidSplitChip: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  paidSplitChipText: { fontSize: 14, fontWeight: '600' },

  // Receipt preview (inline)
  receiptPreview: {
    width: 120,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
  },
  receiptImg: { width: '100%', height: '100%' },
  receiptRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom toolbar
  bottomToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  toolbarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  toolbarItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 56,
  },
  toolbarLabel: { fontSize: 11, marginTop: 3, fontWeight: '500' },

  // Modal shared
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    width: '100%',
    alignSelf: 'center',
  },
  modalSheetSmall: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalBody: { paddingBottom: 30 },

  // Payer modal
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  payerName: { flex: 1, fontSize: 16, fontWeight: '500' },

  // Split modal
  splitTabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  splitTabText: { fontSize: 14, fontWeight: '600' },
  splitInfo: { padding: 16 },
  splitInfoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  splitInfoSub: { fontSize: 13, marginBottom: 12 },
  splitRemaining: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitMemberName: { flex: 1, fontSize: 15, fontWeight: '500' },
  splitMemberAmt: { fontSize: 15, fontWeight: '700' },
  splitInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    gap: 4,
    minWidth: 90,
  },
  splitInputField: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 6,
    minWidth: 40,
    textAlign: 'right',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // Category modal
  catSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Notes modal
  notesInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // Date modal
  dateQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  dateQuickText: { fontSize: 15, fontWeight: '500' },
  dateDivider: { height: 16 },
  dateLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  dateInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // Recurring modal
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recurringLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  recurringSub: {
    fontSize: 13,
    marginBottom: 8,
  },
  recurringIntervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recurringPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  recurringPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
