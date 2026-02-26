import React, { useState } from 'react';
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

export default function SignupScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const signup = useAuthStore((s) => s.signup);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isWide = deviceType !== 'phone';

  const handleSignup = async () => {
    setError('');

    if (password !== confirmPassword) {
      haptic.error();
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await signup(name, email, password, phone || undefined);
    setLoading(false);
    if (result.success) {
      haptic.success();
      router.replace('/(tabs)');
    } else {
      haptic.error();
      setError(result.error || 'Signup failed');
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign up to start splitting expenses with friends
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Full Name *"
            placeholder="John Doe"
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            leftIcon="person"
            autoCapitalize="words"
            autoComplete="name"
          />

          <Input
            label="Email Address *"
            placeholder="your@email.com"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="email"
          />

          <Input
            label="Phone Number (optional)"
            placeholder="+1 555-123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            leftIcon="phone"
          />

          <Input
            label="Password *"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry={!showPassword}
            leftIcon="lock"
            rightIcon={showPassword ? 'visibility-off' : 'visibility'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Input
            label="Confirm Password *"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
            secureTextEntry={!showPassword}
            leftIcon="lock-outline"
            error={confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match' : undefined}
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            fullWidth
            size="large"
            style={{ marginTop: 12 }}
          />

          <Text style={[styles.terms, { color: colors.textTertiary }]}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Text>

          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Log in</Text>
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
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: { marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 14, flex: 1 },
  terms: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  loginText: { fontSize: 15 },
  loginLink: { fontSize: 15, fontWeight: '600' },
});
