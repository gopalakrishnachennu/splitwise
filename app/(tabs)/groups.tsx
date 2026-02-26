import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useGroupStore } from '@/stores/useGroupStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { EmptyState } from '@/components/EmptyState';
import { Group, GroupType } from '@/types';

const GROUP_TYPE_CONFIG: Record<GroupType, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  home: { icon: 'home', color: '#5BC5A7' },
  trip: { icon: 'flight', color: '#44A4E0' },
  couple: { icon: 'favorite', color: '#E8578A' },
  other: { icon: 'group', color: '#A37EDB' },
};

export default function GroupsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups, isLoading } = useGroupStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  const isWide = deviceType === 'tablet' || deviceType === 'desktop';

  const loadData = useCallback(async () => {
    await fetchGroups();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    haptic.medium();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderGroupIcon = (type: GroupType) => {
    const config = GROUP_TYPE_CONFIG[type] || GROUP_TYPE_CONFIG.other;
    return (
      <View style={[styles.groupIcon, { backgroundColor: config.color }]}>
        <MaterialIcons name={config.icon} size={22} color="#FFF" />
      </View>
    );
  };

  const renderGroupItem = ({ item }: { item: Group }) => {
    const memberCount = item.members?.length ?? 0;
    const memberText = memberCount === 1 ? '1 member' : `${memberCount} members`;

    return (
      <TouchableOpacity
        style={[styles.groupRow, { borderBottomColor: colors.borderLight }]}
        onPress={() => {
          haptic.light();
          router.push(`/group/${item.id}`);
        }}
        activeOpacity={0.7}
      >
        {renderGroupIcon(item.type)}

        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.groupSubtext, { color: colors.textSecondary }]} numberOfLines={2}>
            {memberText}
          </Text>
        </View>

        <View style={styles.balanceColumn}>
          <Text style={[styles.settledLabel, { color: colors.textTertiary }]}>
            no expenses
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const NonGroupExpenses = () => (
    <TouchableOpacity
      style={[styles.groupRow, { borderBottomColor: colors.borderLight }]}
      onPress={() => {
        haptic.light();
        router.push('/expense/personal');
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.groupIcon, styles.nonGroupIcon]}>
        <MaterialIcons name="receipt-long" size={22} color="#FFF" />
      </View>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
          Non-group expenses
        </Text>
        <Text style={[styles.groupSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
          Expenses not in any group
        </Text>
      </View>
      <View style={styles.balanceColumn}>
        <Text style={[styles.settledLabel, { color: colors.textTertiary }]}>
          no expenses
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <>
      <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]} numberOfLines={2}>
          Overall, all settled up
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
      <NonGroupExpenses />
    </>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <View style={[styles.footerDivider, { backgroundColor: colors.borderLight }]} />
      <Text style={[styles.footerHintText, { color: colors.textTertiary }]}>
        Hiding groups you settled up with over 7 days ago
      </Text>
      {!showSettled && (
        <TouchableOpacity
          style={[styles.showSettledButton, { borderColor: colors.textTertiary }]}
          onPress={() => {
            haptic.light();
            setShowSettled(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.showSettledText, { color: colors.textSecondary }]}>
            Show settled-up groups
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon="group"
        title="No groups yet"
        subtitle="Create a group to start splitting expenses with friends, roommates, or travel partners."
        actionTitle="Create a Group"
        onAction={() => router.push('/group/create')}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        { backgroundColor: colors.primary, borderBottomColor: colors.border },
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
              onPress={() => { haptic.light(); router.push('/group/create'); }}
              style={styles.headerIconBtn}
            >
              <MaterialIcons name="group-add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroupItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={groups.length > 0 ? ListFooter : undefined}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          isWide && styles.listContentWide,
          groups.length === 0 && styles.listContentEmpty,
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
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
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

  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nonGroupIcon: {
    backgroundColor: '#FF9800',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  groupSubtext: {
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

  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginBottom: 16,
  },
  footerHintText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  showSettledButton: {
    borderWidth: 1.5,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  showSettledText: {
    fontSize: 14,
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
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
