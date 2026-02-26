import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';

export default function VerifyEmailScreen() {
  const colors = useThemeColors();
  const { user, sendVerificationEmail, refreshEmailVerified } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleResend = async () => {
    setSending(true);
    const result = await sendVerificationEmail();
    setSending(false);
    if (result.success) {
      haptic.success();
    } else {
      haptic.error();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshEmailVerified();
    setRefreshing(false);
    haptic.light();
    const { needsEmailVerification } = useAuthStore.getState();
    if (!needsEmailVerification) router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <MaterialIcons name="mark-email-unread" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          We sent a verification link to {user?.email ?? 'your email'}. Click the link to verify your account.
        </Text>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          You need to verify before you can use the app. Check your inbox and spam folder.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleResend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Resend verification email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <MaterialIcons name="refresh" size={20} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>I've verified — refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
