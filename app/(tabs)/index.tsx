import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { formatCurrency } from '@/constants/Currencies';
import { Avatar } from '@/components/Avatar';
import { Friend } from '@/types';

export default function FriendsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { friends, fetchFriends } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);

  const isWide = deviceType === 'tablet' || deviceType === 'desktop';

  const loadData = useCallback(async () => {
    if (!user) return;
    await fetchFriends(user.id);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    haptic.medium();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalOwe = friends.reduce(
    (sum, f) => (f.balance < 0 ? sum + Math.abs(f.balance) : sum), 0,
  );
  const totalOwed = friends.reduce(
    (sum, f) => (f.balance > 0 ? sum + f.balance : sum), 0,
  );

  const summaryParts: string[] = [];
  if (totalOwe > 0) summaryParts.push(`you owe ${formatCurrency(totalOwe, user?.defaultCurrency)}`);
  if (totalOwed > 0) summaryParts.push(`you are owed ${formatCurrency(totalOwed, user?.defaultCurrency)}`);

  let summaryText = 'Overall, all settled up';
  let summaryColor = colors.textSecondary;
  if (summaryParts.length > 0) {
    summaryText = `Overall, ${summaryParts.join(' + ')}`;
    summaryColor = totalOwe > totalOwed ? colors.negative : colors.positive;
  }

  const renderFriendItem = ({ item: friend }: { item: Friend }) => {
    const abs = Math.abs(friend.balance);
    const isOwed = friend.balance > 0;
    const isOwe = friend.balance < 0;
    const settled = friend.balance === 0;

    let balanceLabel = '';
    let balanceAmount = '';
    let balanceColor = colors.textTertiary;
    let breakdownText = 'all settled up';
    let breakdownColor = colors.textTertiary;

    if (isOwe) {
      balanceLabel = 'you owe';
      balanceAmount = formatCurrency(abs, friend.currency);
      balanceColor = colors.negative;
      breakdownText = `You owe ${friend.friendName} ${formatCurrency(abs, friend.currency)}`;
      breakdownColor = colors.negative;
    } else if (isOwed) {
      balanceLabel = 'owes you';
      balanceAmount = formatCurrency(abs, friend.currency);
      balanceColor = colors.positive;
      breakdownText = `${friend.friendName} owes you ${formatCurrency(abs, friend.currency)}`;
      breakdownColor = colors.positive;
    }

    return (
      <TouchableOpacity
        style={[styles.friendRow, { borderBottomColor: colors.borderLight }]}
        onPress={() => {
          haptic.light();
          router.push(`/friend/${friend.id}`);
        }}
        activeOpacity={0.7}
      >
        <Avatar
          name={friend.friendName}
          imageUrl={friend.friendAvatarUrl}
          size={44}
        />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
            {friend.friendName}
          </Text>
          <Text style={[styles.breakdownText, { color: breakdownColor }]} numberOfLines={2}>
            {breakdownText}
          </Text>
        </View>
        <View style={styles.balanceColumn}>
          {settled ? (
            <Text style={[styles.settledLabel, { color: colors.textTertiary }]}>settled up</Text>
          ) : (
            <>
              <Text style={[styles.balanceLabel, { color: balanceColor }]}>{balanceLabel}</Text>
              <Text style={[styles.balanceAmount, { color: balanceColor }]}>{balanceAmount}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
      <Text style={[styles.summaryText, { color: summaryColor }]} numberOfLines={2}>
        {summaryText}
      </Text>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          haptic.light();
          router.push('/search');
        }}
      >
        <MaterialIcons name="tune" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="people-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add friends to start splitting expenses
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        {
          backgroundColor: colors.primary,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 12,
        },
        isWide && styles.headerWide,
      ]}>
        <View style={isWide ? styles.headerInnerWide : styles.headerInner}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="account-balance-wallet" size={28} color="#FFF" />
            <Text style={styles.headerTitle}>Splitwise</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => { haptic.light(); router.push('/search'); }}
              style={styles.headerIconBtn}
            >
              <MaterialIcons name="search" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { haptic.light(); router.push('/friend/add'); }}
              style={styles.headerIconBtn}
            >
              <MaterialIcons name="person-add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriendItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          isWide && styles.listContentWide,
          friends.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, isWide && styles.fabWide]}
        onPress={() => { haptic.medium(); router.push('/expense/add'); }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="description" size={20} color="#FFF" />
        <Text style={styles.fabText}>Add expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerWide: {
    alignItems: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInnerWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  summaryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  listContentWide: {
    alignSelf: 'center',
    maxWidth: 600,
    width: '100%',
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  breakdownText: {
    fontSize: 13,
    lineHeight: 18,
  },
  balanceColumn: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 1,
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  settledLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 78 : 68,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1CC29F',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
  },
  fabWide: {
    right: '50%',
    transform: [{ translateX: 260 }],
  },
  fabText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
