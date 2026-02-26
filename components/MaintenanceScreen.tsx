import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMaintenanceStore } from '@/stores/useMaintenanceStore';

export function MaintenanceScreen() {
  const maintenance = useMaintenanceStore();

  const formatTimeRemaining = (): string | null => {
    if (!maintenance.scheduledEnd) return null;
    const end = new Date(maintenance.scheduledEnd).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `Estimated time: ${hours}h ${mins}m`;
    return `Estimated time: ${mins} minutes`;
  };

  const timeRemaining = formatTimeRemaining();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="build-circle" size={64} color="#FDCB6E" />
      </View>
      <Text style={styles.title}>Under Maintenance</Text>
      <Text style={styles.message}>{maintenance.message}</Text>
      {timeRemaining && (
        <View style={styles.timeBadge}>
          <MaterialIcons name="schedule" size={16} color="#FDCB6E" />
          <Text style={styles.timeText}>{timeRemaining}</Text>
        </View>
      )}
      <ActivityIndicator size="small" color="#5BC5A7" style={{ marginTop: 30 }} />
      <Text style={styles.waitText}>Checking status...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    color: '#8892b0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(253, 203, 110, 0.2)',
  },
  timeText: {
    color: '#FDCB6E',
    fontSize: 14,
    fontWeight: '600',
  },
  waitText: {
    color: '#555',
    fontSize: 12,
    marginTop: 8,
  },
});
