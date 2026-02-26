import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { getSystemHealth } from '@/services/admin';
import { useMaintenanceStore } from '@/stores/useMaintenanceStore';
import { haptic } from '@/utils/haptics';

const DURATION_OPTIONS = [
  { label: '15 min', mins: 15 },
  { label: '30 min', mins: 30 },
  { label: '1 hour', mins: 60 },
  { label: '2 hours', mins: 120 },
  { label: '6 hours', mins: 360 },
  { label: 'Indefinite', mins: 0 },
];

export default function AdminSystemScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<any>(null);

  const maintenance = useMaintenanceStore();
  const [editMessage, setEditMessage] = useState(maintenance.message || 'We are performing scheduled maintenance. The app will be back shortly.');
  const [selectedDuration, setSelectedDuration] = useState(0);

  const isWide = deviceType !== 'phone';

  const fetchHealth = useCallback(async () => {
    try {
      const [data] = await Promise.all([
        getSystemHealth(),
        maintenance.load(),
      ]);
      setHealth(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);
  useEffect(() => {
    if (maintenance.message) setEditMessage(maintenance.message);
  }, [maintenance.message]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptic.medium();
    await fetchHealth();
    setRefreshing(false);
  };

  const handleActivateMaintenance = () => {
    haptic.warning();
    Alert.alert(
      'Activate Maintenance Mode',
      `This will block all regular users from using the app. They will see a maintenance screen.\n\nMessage: "${editMessage}"\n\nDuration: ${DURATION_OPTIONS.find(d => d.mins === selectedDuration)?.label || 'Indefinite'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'destructive',
          onPress: async () => {
            try {
              haptic.heavy();
              const endTime = selectedDuration > 0
                ? new Date(Date.now() + selectedDuration * 60000).toISOString()
                : undefined;
              await maintenance.activate(editMessage, endTime);
              Alert.alert('Maintenance activated', 'Regular users will now see the maintenance screen.');
            } catch (err: any) {
              console.error('Failed to activate maintenance', err);
              Alert.alert(
                'Activation failed',
                err?.message || 'Could not activate maintenance mode. Please check Firestore rules and try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleDeactivateMaintenance = () => {
    haptic.warning();
    Alert.alert(
      'End Maintenance',
      'This will restore normal access for all users immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Maintenance',
          onPress: async () => {
            try {
              haptic.success();
              await maintenance.deactivate();
              Alert.alert('Maintenance ended', 'Normal access has been restored for all users.');
            } catch (err: any) {
              console.error('Failed to deactivate maintenance', err);
              Alert.alert(
                'End failed',
                err?.message || 'Could not end maintenance mode. Please check Firestore rules and try again.'
              );
            }
          },
        },
      ]
    );
  };

  const formatTimeRemaining = (): string => {
    if (!maintenance.scheduledEnd) return 'No end time set (indefinite)';
    const end = new Date(maintenance.scheduledEnd).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return 'Scheduled end has passed';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const maxRows = Math.max(...(health?.tables?.map((t: any) => t.rows) || [1]), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, maxWidth: 1000, alignSelf: 'center', width: '100%' }}
    >
      <Text style={[styles.title, { color: colors.text }]}>System Health</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Maintenance controls & database statistics
      </Text>

      {/* ============ MAINTENANCE WINDOW ============ */}
      <View style={[styles.card, {
        backgroundColor: maintenance.isActive ? '#E74C3C08' : colors.card,
        borderColor: maintenance.isActive ? '#E74C3C40' : colors.borderLight,
      }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons
            name={maintenance.isActive ? 'warning' : 'build-circle'}
            size={22}
            color={maintenance.isActive ? '#E74C3C' : '#FDCB6E'}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Maintenance Window</Text>
          <View style={[styles.statusPill, {
            backgroundColor: maintenance.isActive ? '#E74C3C20' : '#00B89420',
          }]}>
            <View style={[styles.statusDotSmall, {
              backgroundColor: maintenance.isActive ? '#E74C3C' : '#00B894',
            }]} />
            <Text style={[styles.statusPillText, {
              color: maintenance.isActive ? '#E74C3C' : '#00B894',
            }]}>
              {maintenance.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        {maintenance.isActive ? (
          <View>
            {/* Active maintenance info */}
            <View style={[styles.activeInfo, { backgroundColor: '#E74C3C10', borderColor: '#E74C3C25' }]}>
              <MaterialIcons name="error-outline" size={20} color="#E74C3C" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeInfoTitle, { color: '#E74C3C' }]}>
                  Maintenance mode is active
                </Text>
                <Text style={[styles.activeInfoSub, { color: colors.textSecondary }]}>
                  Regular users are seeing the maintenance screen
                </Text>
              </View>
            </View>

            <View style={[styles.infoBlock, { borderColor: colors.borderLight }]}>
              <View style={styles.infoBlockRow}>
                <MaterialIcons name="message" size={14} color={colors.textTertiary} />
                <Text style={[styles.infoBlockLabel, { color: colors.textSecondary }]}>Message</Text>
              </View>
              <Text style={[styles.infoBlockValue, { color: colors.text }]}>{maintenance.message}</Text>
            </View>

            <View style={styles.infoRow2}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoSmallLabel, { color: colors.textTertiary }]}>Started</Text>
                <Text style={[styles.infoSmallValue, { color: colors.text }]}>
                  {maintenance.activatedAt ? new Date(maintenance.activatedAt).toLocaleTimeString() : '-'}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoSmallLabel, { color: colors.textTertiary }]}>Time Remaining</Text>
                <Text style={[styles.infoSmallValue, { color: colors.text }]}>
                  {formatTimeRemaining()}
                </Text>
              </View>
            </View>

            {/* Update message while active */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Update Message</Text>
            <TextInput
              style={[styles.messageInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
              value={editMessage}
              onChangeText={setEditMessage}
              multiline
              numberOfLines={2}
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity
              style={[styles.updateBtn, { backgroundColor: '#FDCB6E20', borderColor: '#FDCB6E40' }]}
              onPress={async () => { haptic.light(); await maintenance.updateMessage(editMessage); Alert.alert('Updated', 'Maintenance message updated.'); }}
            >
              <MaterialIcons name="edit" size={16} color="#FDCB6E" />
              <Text style={[styles.updateBtnText, { color: '#FDCB6E' }]}>Update Message</Text>
            </TouchableOpacity>

            {/* End maintenance */}
            <TouchableOpacity
              style={styles.endBtn}
              onPress={handleDeactivateMaintenance}
              activeOpacity={0.8}
            >
              <MaterialIcons name="play-arrow" size={20} color="#FFF" />
              <Text style={styles.endBtnText}>End Maintenance & Restore Access</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Setup maintenance */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Message shown to users</Text>
            <TextInput
              style={[styles.messageInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
              value={editMessage}
              onChangeText={setEditMessage}
              multiline
              numberOfLines={3}
              placeholder="Enter maintenance message..."
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Expected Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.mins}
                  style={[styles.durationChip, {
                    backgroundColor: selectedDuration === opt.mins ? '#E17055' : colors.surfaceVariant,
                    borderColor: selectedDuration === opt.mins ? '#E17055' : colors.borderLight,
                  }]}
                  onPress={() => { haptic.selection(); setSelectedDuration(opt.mins); }}
                >
                  <Text style={[styles.durationText, {
                    color: selectedDuration === opt.mins ? '#FFF' : colors.textSecondary,
                  }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.activateBtn}
              onPress={handleActivateMaintenance}
              activeOpacity={0.8}
            >
              <MaterialIcons name="pause-circle-filled" size={20} color="#FFF" />
              <Text style={styles.activateBtnText}>Activate Maintenance Mode</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ============ DB SUMMARY ============ */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#6C5CE710', borderColor: '#6C5CE730' }]}>
          <MaterialIcons name="storage" size={22} color="#6C5CE7" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{health?.tables?.length || 0}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tables</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#0984E310', borderColor: '#0984E330' }]}>
          <MaterialIcons name="table-rows" size={22} color="#0984E3" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{health?.totalRecords?.toLocaleString() || 0}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Records</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#00B89410', borderColor: '#00B89430' }]}>
          <MaterialIcons name="sd-storage" size={22} color="#00B894" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{health?.dbSize || 'N/A'}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Est. Size</Text>
        </View>
      </View>

      {/* Database Tables */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="storage" size={20} color="#6C5CE7" />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Database Tables</Text>
        </View>

        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.thText, { color: colors.textTertiary, flex: 2 }]}>Table</Text>
          <Text style={[styles.thText, { color: colors.textTertiary, flex: 1, textAlign: 'center' }]}>Rows</Text>
          <Text style={[styles.thText, { color: colors.textTertiary, flex: 2, textAlign: 'right' }]}>Distribution</Text>
        </View>

        {health?.tables?.map((t: any, idx: number) => {
          const pct = maxRows > 0 ? (t.rows / maxRows) * 100 : 0;
          const barColors = ['#6C5CE7', '#0984E3', '#00B894', '#FDCB6E', '#E17055', '#A29BFE', '#55EFC4', '#FF7675', '#E84393'];
          return (
            <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.tableDot, { backgroundColor: barColors[idx % barColors.length] }]} />
                <Text style={[styles.tableName, { color: colors.text }]}>{t.name}</Text>
              </View>
              <Text style={[styles.tableRowCount, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                {t.rows.toLocaleString()}
              </Text>
              <View style={{ flex: 2 }}>
                <View style={[styles.rowBar, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.rowBarFill, {
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: barColors[idx % barColors.length],
                  }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* System Info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="info" size={20} color="#A29BFE" />
          <Text style={[styles.cardTitle, { color: colors.text }]}>System Info</Text>
        </View>
        {[
          { label: 'App Version', value: 'v1.0.0', icon: 'apps' },
          { label: 'Database Engine', value: 'SQLite (Local)', icon: 'storage' },
          { label: 'Estimated Storage', value: health?.dbSize || 'N/A', icon: 'sd-storage' },
          { label: 'Framework', value: 'Expo SDK 54', icon: 'code' },
          { label: 'Data Mode', value: 'Offline-first', icon: 'cloud-off' },
        ].map((item, idx) => (
          <View key={idx} style={[styles.sysInfoRow, { borderBottomColor: colors.borderLight }]}>
            <MaterialIcons name={item.icon as any} size={16} color={colors.textTertiary} />
            <Text style={[styles.sysInfoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.sysInfoValue, { color: colors.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  // Maintenance
  activeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeInfoTitle: { fontSize: 14, fontWeight: '700' },
  activeInfoSub: { fontSize: 12, marginTop: 2 },
  infoBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoBlockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoBlockLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  infoBlockValue: { fontSize: 14, lineHeight: 20 },
  infoRow2: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoCol: { flex: 1 },
  infoSmallLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  infoSmallValue: { fontSize: 14, fontWeight: '600' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  durationText: { fontSize: 13, fontWeight: '600' },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  activateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  updateBtnText: { fontSize: 13, fontWeight: '600' },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  endBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDotSmall: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  // Summary
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
  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  // Table
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  thText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  tableDot: { width: 8, height: 8, borderRadius: 4 },
  tableName: { fontSize: 13, fontWeight: '500' },
  tableRowCount: { fontSize: 13, fontWeight: '600' },
  rowBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  rowBarFill: { height: '100%', borderRadius: 4 },
  // Sys info
  sysInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  sysInfoLabel: { flex: 1, fontSize: 13 },
  sysInfoValue: { fontSize: 13, fontWeight: '600' },
});
