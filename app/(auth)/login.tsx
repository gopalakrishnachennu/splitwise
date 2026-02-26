import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function LoginScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { login, loginWithApple, resetPassword } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState('');

  const isWide = deviceType !== 'phone';

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      haptic.success();
      router.replace('/(tabs)');
    } else {
      haptic.error();
      setError(result.error || 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    setForgotPasswordMessage(null);
    setError('');
    if (!email.trim()) {
      setForgotPasswordMessage({ type: 'error', text: 'Enter your email above, then tap Forgot password.' });
      return;
    }
    setForgotPasswordLoading(true);
    const result = await resetPassword(email.trim());
    setForgotPasswordLoading(false);
    if (result.success) {
      setForgotPasswordMessage({
        type: 'success',
        text: 'Check your inbox for a password reset link. If you don’t see it, check spam.',
      });
    } else {
      setForgotPasswordMessage({ type: 'error', text: result.error || 'Failed to send reset email.' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.formContainer, isWide && { width: 440 }]}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="account-balance-wallet" size={40} color="#FFF" />
            </View>
            <Text style={[styles.appName, { color: colors.primary }]}>Splitwise</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Split expenses with friends
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {forgotPasswordMessage ? (
            <View style={[
              styles.messageBox,
              {
                backgroundColor: forgotPasswordMessage.type === 'success'
                  ? colors.primary + '18'
                  : colors.error + '15',
              },
            ]}>
              <MaterialIcons
                name={forgotPasswordMessage.type === 'success' ? 'mark-email-read' : 'error-outline'}
                size={18}
                color={forgotPasswordMessage.type === 'success' ? colors.primary : colors.error}
              />
              <Text style={[
                styles.messageText,
                { color: forgotPasswordMessage.type === 'success' ? colors.primary : colors.error },
              ]}>
                {forgotPasswordMessage.text}
              </Text>
            </View>
          ) : null}

          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); setForgotPasswordMessage(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="email"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry={!showPassword}
            leftIcon="lock"
            rightIcon={showPassword ? 'visibility-off' : 'visibility'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={forgotPasswordLoading}
          >
            {forgotPasswordLoading ? (
              <Text style={[styles.forgotText, { color: colors.textTertiary }]}>Sending reset link…</Text>
            ) : (
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            )}
          </TouchableOpacity>

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="large"
            style={{ marginTop: 8 }}
          />

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={async () => {
                setError('');
                setAppleLoading(true);
                haptic.light();
                const result = await loginWithApple();
                setAppleLoading(false);
                if (result.success) {
                  haptic.success();
                  router.replace('/(tabs)');
                } else {
                  haptic.error();
                  if (result.error) setError(result.error);
                }
              }}
              disabled={appleLoading}
              activeOpacity={0.7}
            >
              <MaterialIcons name="apple" size={22} color={colors.text} />
              <Text style={[styles.googleBtnText, { color: colors.text }]}>
                {appleLoading ? 'Signing in...' : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={[styles.signupLink, { color: colors.primary }]}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  scrollContentWide: { alignItems: 'center' },
  formContainer: { maxWidth: 440, width: '100%' },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 16, marginTop: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 14, flex: 1 },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  messageText: { fontSize: 14, flex: 1 },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotText: { fontSize: 14, fontWeight: '500' },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
    marginTop: 10,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: { fontSize: 15 },
  signupLink: { fontSize: 15, fontWeight: '600' },
});
