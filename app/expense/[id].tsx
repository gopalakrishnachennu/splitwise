import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
  useWindowDimensions, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { format, subMonths } from 'date-fns';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGroupStore } from '@/stores/useGroupStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';
import { formatCurrency } from '@/constants/Currencies';
import { getCategoryInfo } from '@/constants/Categories';
import { getRate, convert } from '@/services/fx';
import * as ImagePicker from 'expo-image-picker';

interface Comment {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { currentExpense, fetchExpense, deleteExpense } = useExpenseStore();
  const { groups } = useGroupStore();

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [fxRateToGroup, setFxRateToGroup] = useState<number | null>(null);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  const [convertedToUser, setConvertedToUser] = useState<number | null>(null);

  const insets = useSafeAreaInsets();
  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 600 : width;

  useEffect(() => {
    if (id) fetchExpense(id);
  }, [id]);

  useEffect(() => {
    if (currentExpense?.receiptUrl) {
      setReceiptUri(currentExpense.receiptUrl);
    }
  }, [currentExpense?.receiptUrl]);

  useEffect(() => {
    if (!currentExpense || !user) return;
    const expCur = currentExpense.currency || 'USD';
    const groupCur = group?.defaultCurrency || 'USD';
    const userCur = user.defaultCurrency || 'USD';

    if (expCur !== groupCur) {
      if (currentExpense.fxToGroupRate != null) {
        setFxRateToGroup(currentExpense.fxToGroupRate);
        setFxUpdatedAt(currentExpense.fxUpdatedAt ?? null);
      } else {
        getRate(expCur, groupCur)
          .then((r) => {
            setFxRateToGroup(r.rate);
            setFxUpdatedAt(r.updatedAt);
          })
          .catch(() => { setFxRateToGroup(null); setFxUpdatedAt(null); });
      }
    } else {
      setFxRateToGroup(null);
      setFxUpdatedAt(null);
    }

    if (expCur !== userCur) {
      convert(currentExpense.amount, expCur, userCur)
        .then((r) => setConvertedToUser(r.amount))
        .catch(() => setConvertedToUser(null));
    } else {
      setConvertedToUser(null);
    }
  }, [currentExpense?.id, currentExpense?.currency, currentExpense?.amount, currentExpense?.fxToGroupRate, currentExpense?.fxUpdatedAt, group?.defaultCurrency, group?.id, user?.defaultCurrency, user?.id]);

  const group = useMemo(() => {
    if (!currentExpense?.groupId) return null;
    return groups.find((g) => g.id === currentExpense.groupId) ?? null;
  }, [currentExpense?.groupId, groups]);

  const category = currentExpense ? getCategoryInfo(currentExpense.category) : null;

  const creatorName = useMemo(() => {
    if (!currentExpense) return '';
    if (currentExpense.createdBy === user?.id) return 'you';
    const payer = currentExpense.paidBy.find((p) => p.userId === currentExpense.createdBy);
    if (payer) return payer.userName;
    const split = currentExpense.splitBetween.find((s) => s.userId === currentExpense.createdBy);
    return split?.userName ?? 'someone';
  }, [currentExpense, user]);

  const trendMonths = useMemo(() => {
    const now = new Date();
    const amounts = [
      Math.random() * 30 + 5,
      Math.random() * 30 + 5,
      currentExpense?.amount ?? 20,
    ];
    const maxAmount = Math.max(...amounts);
    return [2, 1, 0].map((offset, i) => {
      const d = subMonths(now, offset);
      return {
        label: format(d, 'MMM'),
        amount: amounts[i],
        ratio: amounts[i] / maxAmount,
      };
    });
  }, [currentExpense?.amount]);

  const handleDelete = () => {
    if (!currentExpense) return;
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
      ],
    );
  };

  const handlePickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || !user) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        userName: user.name,
        text: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCommentText('');
  };

  if (!currentExpense || !category) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  const groupLabel = group?.name ?? 'No group';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          isWide && { alignSelf: 'center', width: contentMaxWidth },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ===== TOP NAV BAR ===== */}
        <View style={[styles.navBar, { borderBottomColor: colors.borderLight, paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Details</Text>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={handleDelete} hitSlop={12} style={styles.navBtn}>
              <MaterialIcons name="delete-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/expense/add?editId=${currentExpense.id}`)}
              hitSlop={12}
              style={styles.navBtn}
            >
              <MaterialIcons name="edit" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== TOP CARD ===== */}
        <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.topCardRow}>
            {/* Left: category icon + name + amount */}
            <View style={styles.topCardLeft}>
              <View style={styles.expenseHeader}>
                <View style={[styles.categorySquare, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialIcons name={category.icon as any} size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.expenseHeaderText}>
                  <Text style={[styles.expenseName, { color: colors.text }]} numberOfLines={2}>
                    {currentExpense.description}
                  </Text>
                  <Text style={[styles.expenseAmount, { color: colors.text }]}>
                    {formatCurrency(currentExpense.amount, currentExpense.currency)}
                  </Text>
                </View>
              </View>

              {/* Group badge */}
              <View style={[styles.groupBadge, { backgroundColor: colors.surfaceVariant }]}>
                <MaterialIcons name="group" size={14} color={colors.textSecondary} />
                <Text style={[styles.groupBadgeText, { color: colors.textSecondary }]}>
                  {groupLabel}
                </Text>
              </View>

              {/* Added by */}
              <Text style={[styles.addedBy, { color: colors.textTertiary }]}>
                Added by {creatorName} on {format(new Date(currentExpense.date), 'MMMM d, yyyy')}
              </Text>
            </View>

            {/* Right: receipt placeholder */}
            <TouchableOpacity
              onPress={!receiptUri ? handlePickReceipt : undefined}
              activeOpacity={receiptUri ? 1 : 0.7}
              style={[
                styles.receiptBox,
                {
                  borderColor: colors.textTertiary,
                  backgroundColor: receiptUri ? 'transparent' : colors.surfaceVariant,
                },
              ]}
            >
              {receiptUri ? (
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
              ) : (
                <MaterialIcons name="camera-alt" size={28} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== FX (when expense currency differs from group / user) ===== */}
        {((currentExpense.currency && currentExpense.currency !== (group?.defaultCurrency || 'USD')) || (convertedToUser != null && currentExpense.currency !== user?.defaultCurrency)) && (
          <View style={[styles.fxCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight }]}>
            <View style={styles.fxCardRow}>
              <MaterialIcons name="trending-up" size={18} color={colors.textSecondary} />
              <Text style={[styles.fxCardTitle, { color: colors.textSecondary }]}>FX conversion</Text>
            </View>
            {fxRateToGroup != null && group?.defaultCurrency && currentExpense.currency !== group.defaultCurrency && (
              <Text style={[styles.fxCardRate, { color: colors.text }]}>
                1 {currentExpense.currency} = {fxRateToGroup.toFixed(4)} {group.defaultCurrency}
                {fxUpdatedAt ? ` · ${format(new Date(fxUpdatedAt), 'MMM d')}` : ''}
              </Text>
            )}
            {convertedToUser != null && user?.defaultCurrency && currentExpense.currency !== user.defaultCurrency && (
              <Text style={[styles.fxCardConverted, { color: colors.text }]}>
                In your currency: {formatCurrency(convertedToUser, user.defaultCurrency)}
              </Text>
            )}
          </View>
        )}

        {/* ===== PAID BY ===== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {currentExpense.paidBy.map((payer) => (
            <View key={payer.userId} style={styles.paidByRow}>
              <Avatar name={payer.userName} size={36} />
              <Text style={[styles.paidByText, { color: colors.text }]}>
                <Text style={{ fontWeight: '600' }}>
                  {payer.userId === user?.id ? 'You' : payer.userName}
                </Text>
                {' paid '}
                <Text style={{ fontWeight: '600' }}>
                  {formatCurrency(payer.amount, currentExpense.currency)}
                </Text>
              </Text>
            </View>
          ))}
        </View>

        {/* ===== SPLIT LIST ===== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {currentExpense.splitBetween.map((split, idx) => (
            <View
              key={split.userId}
              style={[
                styles.splitRow,
                idx < currentExpense.splitBetween.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderLight,
                },
              ]}
            >
              <Avatar name={split.userName} size={32} />
              <Text style={[styles.splitName, { color: colors.text }]}>
                {split.userId === user?.id ? 'You' : split.userName}
              </Text>
              <Text style={[styles.splitOwes, { color: colors.negative }]}>
                owes {formatCurrency(split.amount, currentExpense.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* ===== SPENDING TRENDS ===== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Spending trends for {groupLabel} :: {category.label}
          </Text>
          <View style={styles.trendChart}>
            {trendMonths.map((m) => (
              <View key={m.label} style={styles.trendRow}>
                <Text style={[styles.trendLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                <View style={[styles.trendBarTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.trendBar,
                      {
                        width: `${Math.max(m.ratio * 100, 8)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.trendAmount, { color: colors.text }]}>
                  {formatCurrency(m.amount, currentExpense.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== COMMENTS ===== */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.textTertiary }]}>No comments yet.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Avatar name={c.userName} size={28} />
                <View style={styles.commentContent}>
                  <Text style={[styles.commentUser, { color: colors.text }]}>{c.userName}</Text>
                  <Text style={[styles.commentText, { color: colors.textSecondary }]}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ===== COMMENT INPUT ===== */}
      <View style={[styles.commentInputBar, { backgroundColor: colors.card, borderTopColor: colors.borderLight, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.surfaceVariant,
              color: colors.text,
              borderColor: colors.borderLight,
            },
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textTertiary}
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={handleAddComment}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleAddComment}
          disabled={!commentText.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: commentText.trim() ? colors.primary : colors.surfaceVariant },
          ]}
        >
          <MaterialIcons
            name="send"
            size={18}
            color={commentText.trim() ? '#FFF' : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16 },
  scrollContent: { paddingBottom: 16 },

  /* Nav bar */
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 6 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  /* Top card */
  topCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topCardLeft: { flex: 1, marginRight: 12 },
  expenseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  categorySquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseHeaderText: { flex: 1 },
  expenseName: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  expenseAmount: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  fxCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  fxCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  fxCardTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  fxCardRate: { fontSize: 13, marginTop: 2 },
  fxCardConverted: { fontSize: 14, fontWeight: '600', marginTop: 4 },

  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 12,
  },
  groupBadgeText: { fontSize: 13, fontWeight: '500' },
  addedBy: { fontSize: 12, marginTop: 10, lineHeight: 17 },

  /* Receipt */
  receiptBox: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  receiptImage: { width: '100%', height: '100%' },

  /* Sections */
  section: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Paid by */
  paidByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paidByText: { fontSize: 15, flexShrink: 1 },

  /* Split */
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  splitName: { flex: 1, fontSize: 15, fontWeight: '500' },
  splitOwes: { fontSize: 14, fontWeight: '600' },

  /* Spending trends */
  trendChart: { gap: 10 },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendLabel: { width: 32, fontSize: 12, fontWeight: '500' },
  trendBarTrack: {
    flex: 1,
    height: 18,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBar: { height: '100%', borderRadius: 4 },
  trendAmount: { width: 60, fontSize: 12, fontWeight: '500', textAlign: 'right' },

  /* Comments */
  noComments: { fontSize: 14, fontStyle: 'italic' },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  commentContent: { flex: 1 },
  commentUser: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 14, marginTop: 1 },

  /* Comment input */
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
