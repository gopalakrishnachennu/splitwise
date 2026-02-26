import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import * as db from '@/services/database';

export default function AddFriendScreen() {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const { friends, addFriend, fetchFriends } = useFriendStore();
  const [contact, setContact] = useState(''); // email or phone
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<string>('');

  const handleAdd = async () => {
    setError('');
    setInfo('');
    const value = contact.trim();
    if (!value) {
      haptic.error();
      setError(Platform.OS === 'web' ? 'Enter their email address' : 'Enter a phone number or email address');
      return;
    }
    const isEmail = value.includes('@');
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      haptic.error();
      setError('Enter a valid email address');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      let friendId: string;
      let friendEmail: string | undefined;
      let friendPhone: string | undefined;
      let friendName = name.trim();
      let status: 'linked' | 'invited' = 'linked';
      let inviteEmail: string | undefined;
      let invitePhone: string | undefined;

      if (isEmail) {
        const found = await db.getUserByEmail(value);
        if (found) {
          if (found.id === user.id) {
            setError("You can't add yourself.");
            haptic.error();
            setLoading(false);
            return;
          }
          const already = friends.some((f) => f.friendId === found.id);
          if (already) {
            setError(`${found.name} is already in your friends.`);
            haptic.error();
            setLoading(false);
            return;
          }
          friendId = found.id;
          friendEmail = found.email;
          friendPhone = found.phone || undefined;
          if (!friendName) friendName = found.name || found.email;
          setInfo('Account found — we will link them immediately.');
        } else {
          // No existing account — Splitwise-style invite/pending friend.
          const alreadyInvited = friends.some((f) => (f.inviteEmail || f.friendEmail || '').toLowerCase() === value.toLowerCase());
          if (alreadyInvited) {
            setError('This email is already in your friends (invite pending).');
            haptic.error();
            setLoading(false);
            return;
          }
          status = 'invited';
          inviteEmail = value.toLowerCase();
          friendId = `inv:${inviteEmail}`;
          friendEmail = inviteEmail;
          if (!friendName) friendName = inviteEmail;
          setInfo('Invite pending — they’ll be linked automatically once they create an account.');
        }
      } else {
        // Phone-only contact
        const alreadyInvited = friends.some((f) => (f.invitePhone || f.friendPhone || '') === value);
        if (alreadyInvited) {
          setError('This phone number is already in your friends (invite pending).');
          haptic.error();
          setLoading(false);
          return;
        }
        status = 'invited';
        invitePhone = value;
        friendId = `inv:${invitePhone}`;
        friendPhone = invitePhone;
        if (!friendName) friendName = invitePhone;
        setInfo('Invite pending — they’ll be linked automatically once they create an account.');
      }

      await addFriend({
        userId: user.id,
        friendId,
        friendName,
        friendEmail,
        friendPhone,
        friendAvatarUrl: undefined,
        balance: 0,
        currency: user.defaultCurrency || 'USD',
        status,
        inviteEmail,
        invitePhone,
      });
      await fetchFriends(user.id);
      haptic.success();
      if (Platform.OS === 'web') {
        // On web, keep the user on the page with clear feedback.
        setContact('');
        setName('');
        setLoading(false);
        return;
      }
      router.back();
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Please try again.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add friend', headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, Platform.OS === 'web' && { alignSelf: 'center', width: '100%' }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>Add friend</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {Platform.OS === 'web'
              ? 'Add someone by email. If they already use the app, we will link their account automatically.'
              : 'Add a friend by name and phone number or email. Nothing gets sent yet – this just helps you track balances.'}
          </Text>
          <Input
            label={Platform.OS === 'web' ? 'Email' : 'Phone number or email address'}
            placeholder={Platform.OS === 'web' ? 'friend@example.com' : '+1 555 0100 or friend@example.com'}
            value={contact}
            onChangeText={(t) => { setContact(t); setError(''); }}
            keyboardType={Platform.OS === 'web' ? 'email-address' : 'default'}
            autoCapitalize="none"
            autoComplete={Platform.OS === 'web' ? 'email' : 'off'}
            leftIcon={Platform.OS === 'web' ? 'email' : 'phone'}
          />
          <Input
            label="Name (optional)"
            placeholder="Display name"
            value={name}
            onChangeText={setName}
            leftIcon="person"
          />
          {info ? (
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{info}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '18' }]}>
              <MaterialIcons name="error-outline" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}
          <Button
            title={loading ? 'Adding...' : 'Add friend'}
            onPress={handleAdd}
            loading={loading}
            fullWidth
            size="large"
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, maxWidth: 520 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14 },
});
