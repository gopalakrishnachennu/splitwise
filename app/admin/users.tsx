import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType, useDebounce } from '@/utils/hooks';
import { AdminUser, getAdminUsers, deleteUserAdmin } from '@/services/admin';
import { haptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';

export default function AdminUsersScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const isWide = deviceType !== 'phone';

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAdminUsers(debouncedSearch);
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchUsers();
    setRefreshing(false);
  };

  const handleDeleteUser = (user: AdminUser) => {
    haptic.warning();
    Alert.alert(
      'Delete User',
      `Permanently delete "${user.name}" (${user.email})?\n\nThis removes all their data including expenses, groups, and settlements. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptic.heavy();
            await deleteUserAdmin(user.id);
            setSelectedUser(null);
            fetchUsers();
            Alert.alert('Deleted', `User "${user.name}" has been permanently deleted.`);
          },
        },
      ]
    );
  };

  const UserCard = ({ user: u }: { user: AdminUser }) => (
    <TouchableOpacity
      style={[styles.userCard, {
        backgroundColor: selectedUser?.id === u.id ? colors.primaryLight : colors.card,
        borderColor: selectedUser?.id === u.id ? colors.primary : colors.borderLight,
      }]}
      onPress={() => { haptic.selection(); setSelectedUser(u); }}
      activeOpacity={0.7}
    >
      <Avatar name={u.name} size={44} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{u.email}</Text>
        <View style={styles.userMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="group" size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{u.groupCount} groups</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="receipt" size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{u.expenseCount} expenses</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="attach-money" size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>${u.totalSpent.toFixed(0)}</Text>
          </View>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const UserDetail = ({ user: u }: { user: AdminUser }) => (
    <ScrollView style={styles.detailPanel} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.detailHeader}>
        <Avatar name={u.name} size={64} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={[styles.detailName, { color: colors.text }]}>{u.name}</Text>
          <Text style={[styles.detailEmail, { color: colors.textSecondary }]}>{u.email}</Text>
          {u.phone && <Text style={[styles.detailPhone, { color: colors.textSecondary }]}>{u.phone}</Text>}
        </View>
        <TouchableOpacity onPress={() => setSelectedUser(null)}>
          <MaterialIcons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.detailStats}>
        {[
          { label: 'Groups', value: u.groupCount.toString(), icon: 'group-work', color: '#6C5CE7' },
          { label: 'Expenses', value: u.expenseCount.toString(), icon: 'receipt', color: '#0984E3' },
          { label: 'Spent', value: `$${u.totalSpent.toFixed(2)}`, icon: 'payments', color: '#00B894' },
        ].map((s, i) => (
          <View key={i} style={[styles.detailStatCard, { backgroundColor: s.color + '10', borderColor: s.color + '30' }]}>
            <MaterialIcons name={s.icon as any} size={20} color={s.color} />
            <Text style={[styles.detailStatValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.infoSection, { borderColor: colors.borderLight }]}>
        <Text style={[styles.infoTitle, { color: colors.textSecondary }]}>ACCOUNT DETAILS</Text>
        <InfoRow icon="badge" label="User ID" value={u.id.slice(0, 16) + '...'} colors={colors} />
        <InfoRow icon="attach-money" label="Currency" value={u.defaultCurrency} colors={colors} />
        <InfoRow icon="calendar-today" label="Joined" value={new Date(u.createdAt).toLocaleDateString()} colors={colors} />
      </View>

      <TouchableOpacity
        style={[styles.deleteBtn, { backgroundColor: '#E74C3C12', borderColor: '#E74C3C30' }]}
        onPress={() => handleDeleteUser(u)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="delete-forever" size={18} color="#E74C3C" />
        <Text style={styles.deleteBtnText}>Delete User & All Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.listPanel, isWide && selectedUser ? { flex: 1 } : { flex: 1 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <MaterialIcons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }, Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
            placeholder="Search users by name, email, or phone..."
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

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>All Users ({users.length})</Text>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        >
          {users.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search ? 'No users match your search' : 'No users yet'}
              </Text>
            </View>
          ) : (
            users.map((u) => <UserCard key={u.id} user={u} />)
          )}
        </ScrollView>
      </View>

      {isWide && selectedUser && (
        <View style={[styles.detailContainer, { backgroundColor: colors.surface, borderLeftColor: colors.border }]}>
          <UserDetail user={selectedUser} />
        </View>
      )}

      {!isWide && selectedUser && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 10 }]}>
          <View style={[styles.mobileDetailHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.mobileDetailTitle, { color: colors.text }]}>User Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <UserDetail user={selectedUser} />
        </View>
      )}
    </View>
  );
}

const InfoRow = ({ icon, label, value, colors }: any) => (
  <View style={styles.infoRow}>
    <MaterialIcons name={icon} size={16} color={colors.textTertiary} />
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listPanel: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  listTitle: { fontSize: 16, fontWeight: '700' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 13, marginTop: 1 },
  userMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
  detailContainer: { width: 400, borderLeftWidth: 1 },
  detailPanel: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailName: { fontSize: 20, fontWeight: '700' },
  detailEmail: { fontSize: 14, marginTop: 2 },
  detailPhone: { fontSize: 13, marginTop: 2 },
  detailStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  detailStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  detailStatValue: { fontSize: 18, fontWeight: '700' },
  detailStatLabel: { fontSize: 11, fontWeight: '500' },
  infoSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  infoLabel: { flex: 1, fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deleteBtnText: { color: '#E74C3C', fontSize: 14, fontWeight: '600' },
  mobileDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  mobileDetailTitle: { fontSize: 17, fontWeight: '600' },
});
