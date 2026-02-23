import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useGroupStore } from '@/stores/useGroupStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { GroupCard } from '@/components/GroupCard';
import { EmptyState } from '@/components/EmptyState';

export default function GroupsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { groups, fetchGroups, isLoading } = useGroupStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchGroups();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isWide = deviceType !== 'phone';
  const numColumns = deviceType === 'desktop' ? 2 : 1;
  const contentMaxWidth = isWide ? 900 : width;

  if (groups.length === 0 && !isLoading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="group"
          title="No groups yet"
          subtitle="Create a group to start splitting expenses with friends, roommates, or travel partners."
          actionTitle="Create a Group"
          onAction={() => router.push('/group/create')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[
          styles.listContent,
          isWide && { alignSelf: 'center', width: contentMaxWidth },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={numColumns > 1 ? { flex: 1, paddingHorizontal: 4 } : undefined}>
            <GroupCard
              group={item}
              onPress={() => router.push(`/group/${item.id}`)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/group/create')}
            >
              <MaterialIcons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>New Group</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1 },
  listContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
