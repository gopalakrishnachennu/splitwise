import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';

const APP_NAME = Constants.expoConfig?.name ?? 'Splitwise';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const FIREBASE_PROJECT = 'splitx-27952';

const CONTROL_ITEMS = [
  { icon: 'people', label: 'Users', desc: 'View, search, delete users. Promote or remove admin access.' },
  { icon: 'group-work', label: 'Groups', desc: 'View all groups, delete groups.' },
  { icon: 'receipt-long', label: 'Expenses', desc: 'View, search, filter, and delete any expense.' },
  { icon: 'insights', label: 'Analytics', desc: 'Categories, signups, top users/groups, currency distribution.' },
  { icon: 'history', label: 'Activity log', desc: 'App and admin actions (who deleted what, role changes).' },
  { icon: 'memory', label: 'System', desc: 'DB health, maintenance mode (block all users).' },
  { icon: 'palette', label: 'App branding', desc: 'App name, icon, splash: edit app.json and assets, then rebuild.' },
];

export default function AdminSettingsScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const isWide = deviceType !== 'phone';
  const maxWidth = isWide ? 640 : width;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { maxWidth }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Settings & branding</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        App identity and where to change it
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="info-outline" size={22} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>App info</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>App name</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>{APP_NAME}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Version</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>{APP_VERSION}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Firebase project</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>{FIREBASE_PROJECT}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Icon / splash</Text>
          <Text style={[styles.rowValue, { color: colors.textTertiary, fontSize: 12 }]}>app.json, assets/</Text>
        </View>
        <TouchableOpacity
          style={[styles.linkBtn, { borderColor: colors.primary }]}
          onPress={() => {
            haptic.light();
            Linking.openURL('https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/');
          }}
        >
          <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
          <Text style={[styles.linkBtnText, { color: colors.primary }]}>How to change app icon (Expo)</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="admin-panel-settings" size={22} color="#5BC5A7" />
          <Text style={[styles.cardTitle, { color: colors.text }]}>What you control</Text>
        </View>
        <Text style={[styles.controlIntro, { color: colors.textSecondary }]}>
          As the app owner you have full visibility and control over data and access. Everything below is available from the admin sidebar.
        </Text>
        {CONTROL_ITEMS.map((item, idx) => (
          <View key={idx} style={[styles.controlRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.controlIcon, { backgroundColor: colors.primaryLight }]}>
              <MaterialIcons name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.controlText}>
              <Text style={[styles.controlLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.controlDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, alignSelf: 'center', width: '100%' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkBtnText: { fontSize: 14, fontWeight: '600' },
  controlIntro: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  controlIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: { flex: 1 },
  controlLabel: { fontSize: 15, fontWeight: '600' },
  controlDesc: { fontSize: 12, marginTop: 2 },
});
