import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useWindowDimensions, Platform, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { verifyAdminAccess } from '@/services/admin';
import { haptic } from '@/utils/haptics';

const NAV_ITEMS = [
  { key: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { key: '/admin/users', icon: 'people', label: 'Users' },
  { key: '/admin/groups', icon: 'group-work', label: 'Groups' },
  { key: '/admin/expenses', icon: 'receipt-long', label: 'Expenses' },
  { key: '/admin/analytics', icon: 'insights', label: 'Analytics' },
  { key: '/admin/activity-log', icon: 'history', label: 'Activity Log' },
  { key: '/admin/system', icon: 'memory', label: 'System' },
] as const;

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const colors = useThemeColors();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (verifyAdminAccess(code)) {
      haptic.success();
      setError('');
      onSuccess();
    } else {
      haptic.error();
      setError('Invalid access code');
      setCode('');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.loginContainer, { backgroundColor: '#0f0f1a' }]} behavior="padding">
      <View style={styles.loginCard}>
        <View style={styles.loginIconWrap}>
          <MaterialIcons name="admin-panel-settings" size={48} color="#5BC5A7" />
        </View>
        <Text style={styles.loginTitle}>Admin Panel</Text>
        <Text style={styles.loginSubtitle}>Enter your access code to continue</Text>

        <TextInput
          style={[styles.loginInput, error ? styles.loginInputError : null,
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
          placeholder="Access code"
          placeholderTextColor="#555"
          secureTextEntry
          value={code}
          onChangeText={(t) => { setCode(t); setError(''); }}
          onSubmitEditing={handleLogin}
          autoFocus
        />

        {error ? <Text style={styles.loginError}>{error}</Text> : null}

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.8}>
          <Text style={styles.loginBtnText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={16} color="#8892b0" />
          <Text style={styles.backLinkText}>Back to app</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function AdminLayout() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = deviceType !== 'phone';
  const [authenticated, setAuthenticated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />;
  }

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  if (!isWide) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.mobileHeader, { backgroundColor: '#1a1a2e', paddingTop: Platform.OS === 'web' ? 8 : 48 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.mobileBackBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <MaterialIcons name="admin-panel-settings" size={22} color="#5BC5A7" />
          <Text style={styles.mobileHeaderTitle}>Admin Panel</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={[styles.mobileNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === '/admin' ? pathname === '/admin' : pathname.startsWith(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.mobileNavItem, isActive && { borderBottomColor: '#5BC5A7', borderBottomWidth: 2 }]}
                onPress={() => router.replace(item.key as any)}
              >
                <MaterialIcons name={item.icon as any} size={18} color={isActive ? '#5BC5A7' : colors.textSecondary} />
                <Text style={[styles.mobileNavLabel, { color: isActive ? '#5BC5A7' : colors.textSecondary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Slot />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: '#1a1a2e' }]}>
        <View style={styles.sidebarHeader}>
          {!sidebarCollapsed && (
            <View style={styles.sidebarBrand}>
              <MaterialIcons name="admin-panel-settings" size={28} color="#5BC5A7" />
              <Text style={styles.sidebarTitle}>Admin Panel</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setSidebarCollapsed(!sidebarCollapsed)} style={styles.collapseBtn}>
            <MaterialIcons name={sidebarCollapsed ? 'chevron-right' : 'chevron-left'} size={20} color="#8892b0" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === '/admin' ? pathname === '/admin' : pathname.startsWith(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => router.replace(item.key as any)}
              >
                <MaterialIcons name={item.icon as any} size={20} color={isActive ? '#5BC5A7' : '#8892b0'} />
                {!sidebarCollapsed && (
                  <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.sidebarItem, { marginBottom: 16 }]}
          onPress={() => { setAuthenticated(false); router.back(); }}
        >
          <MaterialIcons name="exit-to-app" size={20} color="#FF6B6B" />
          {!sidebarCollapsed && <Text style={[styles.sidebarLabel, { color: '#FF6B6B' }]}>Logout</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  // Login
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCard: {
    width: 360,
    maxWidth: '90%',
    alignItems: 'center',
    padding: 32,
  },
  loginIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 197, 167, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  loginSubtitle: {
    color: '#8892b0',
    fontSize: 14,
    marginBottom: 28,
  },
  loginInput: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginInputError: {
    borderColor: '#E74C3C',
  },
  loginError: {
    color: '#E74C3C',
    fontSize: 13,
    marginBottom: 8,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#5BC5A7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  backLinkText: {
    color: '#8892b0',
    fontSize: 14,
  },
  // Sidebar
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  collapseBtn: { padding: 4 },
  sidebarNav: { flex: 1, paddingTop: 8 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(91, 197, 167, 0.12)',
  },
  sidebarLabel: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarLabelActive: {
    color: '#5BC5A7',
    fontWeight: '600',
  },
  mainContent: { flex: 1 },
  // Mobile
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  mobileBackBtn: { marginRight: 4 },
  mobileHeaderTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  mobileNav: {
    borderBottomWidth: 1,
    maxHeight: 48,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  mobileNavLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
