import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType, useDebounce } from '@/utils/hooks';
import { AdminGroup, getAdminGroups, deleteGroupAdmin } from '@/services/admin';
import { haptic } from '@/utils/haptics';

const TYPE_ICONS: Record<string, string> = {
  home: 'home',
  trip: 'flight',
  couple: 'favorite',
  other: 'group-work',
};

export default function AdminGroupsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const isWide = deviceType !== 'phone';

  const fetchGroups = useCallback(async () => {
    try {
      const data = await getAdminGroups(debouncedSearch);
      setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchGroups();
    setRefreshing(false);
  };

  const handleDeleteGroup = (group: AdminGroup) => {
    haptic.warning();
    Alert.alert(
      'Delete Group',
      `Permanently delete group "${group.name}"? All associated expenses will remain but group data will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptic.heavy();
            await deleteGroupAdmin(group.id);
            fetchGroups();
            Alert.alert('Deleted', `Group "${group.name}" has been deleted.`);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalExpenses = groups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalMembers = groups.reduce((sum, g) => sum + g.memberCount, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Group Management</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Monitor and manage all groups on the platform
      </Text>

      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Total Groups', value: groups.length.toString(), icon: 'group-work', color: '#6C5CE7' },
          { label: 'Total Members', value: totalMembers.toString(), icon: 'people', color: '#0984E3' },
          { label: 'Total Volume', value: `$${totalExpenses.toFixed(0)}`, icon: 'payments', color: '#00B894' },
        ].map((s, i) => (
          <View key={i} style={[styles.summaryCard, { backgroundColor: s.color + '10', borderColor: s.color + '30' }]}>
            <MaterialIcons name={s.icon as any} size={20} color={s.color} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <MaterialIcons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }, Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
          placeholder="Search groups..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Group List */}
      {groups.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="group-off" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {search ? 'No groups match your search' : 'No groups yet'}
          </Text>
        </View>
      ) : (
        <View style={[styles.groupGrid, isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }]}>
          {groups.map((g) => (
            <View
              key={g.id}
              style={[
                styles.groupCard,
                { backgroundColor: colors.card, borderColor: colors.borderLight },
                isWide && { width: '48%' as any, minWidth: 300 },
              ]}
            >
              <View style={styles.groupHeader}>
                <View style={[styles.groupIcon, { backgroundColor: colors.primaryLight }]}>
                  <MaterialIcons name={(TYPE_ICONS[g.type] || 'group-work') as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
                  <Text style={[styles.groupType, { color: colors.textTertiary }]}>{g.type} group</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteGroup(g)}>
                  <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={[styles.groupStats, { borderTopColor: colors.borderLight }]}>
                <View style={styles.groupStat}>
                  <MaterialIcons name="people" size={14} color={colors.textTertiary} />
                  <Text style={[styles.groupStatText, { color: colors.textSecondary }]}>
                    {g.memberCount} members
                  </Text>
                </View>
                <View style={styles.groupStat}>
                  <MaterialIcons name="receipt" size={14} color={colors.textTertiary} />
                  <Text style={[styles.groupStatText, { color: colors.textSecondary }]}>
                    {g.expenseCount} expenses
                  </Text>
                </View>
                <View style={styles.groupStat}>
                  <MaterialIcons name="payments" size={14} color={colors.primary} />
                  <Text style={[styles.groupStatText, { color: colors.primary, fontWeight: '600' }]}>
                    {g.defaultCurrency} {g.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.groupDate, { color: colors.textTertiary }]}>
                Created {new Date(g.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
  groupGrid: {},
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600' },
  groupType: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  groupStats: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  groupStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupStatText: { fontSize: 13 },
  groupDate: { fontSize: 11, marginTop: 10 },
});
