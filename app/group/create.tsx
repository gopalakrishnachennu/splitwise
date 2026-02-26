import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
const uuidv4 = (): string => Crypto.randomUUID();
import { useGroupStore } from '@/stores/useGroupStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFriendStore } from '@/stores/useFriendStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { GroupType, GroupMember } from '@/types';

const GROUP_TYPES: { type: GroupType; label: string; icon: string; color: string }[] = [
  { type: 'home', label: 'Home', icon: 'home', color: '#E84393' },
  { type: 'trip', label: 'Trip', icon: 'flight', color: '#0984E3' },
  { type: 'couple', label: 'Couple', icon: 'favorite', color: '#E17055' },
  { type: 'other', label: 'Other', icon: 'group', color: '#6C5CE7' },
];

export default function CreateGroupScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { createGroup } = useGroupStore();
  const { friends } = useFriendStore();
  const linkedFriends = friends.filter((f) => (f.status ?? 'linked') === 'linked');

  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('other');
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [memberName, setMemberName] = useState('');
  const [memberContact, setMemberContact] = useState('');
  const [manualMembers, setManualMembers] = useState<GroupMember[]>([]);

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 600 : width;

  const toggleFriend = (friendId: string) => {
    const next = new Set(selectedFriends);
    if (next.has(friendId)) next.delete(friendId);
    else next.add(friendId);
    setSelectedFriends(next);
  };

  const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const addManualMember = () => {
    if (!memberName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    const contact = memberContact.trim();
    const email = isEmail(contact) ? contact : undefined;
    const phone = !isEmail(contact) && contact ? contact : undefined;

    setManualMembers([
      ...manualMembers,
      {
        id: uuidv4(),
        userId: uuidv4(),
        name: memberName.trim(),
        email: email || '',
        phone: phone || '',
      },
    ]);
    setMemberName('');
    setMemberContact('');
  };

  const handleCreate = async () => {
    if (!name.trim()) { haptic.error(); Alert.alert('Error', 'Please enter a group name'); return; }
    if (!user) return;

    const totalMembers = 1 + selectedFriends.size + manualMembers.length;
    if (totalMembers < 2) {
      haptic.error();
      Alert.alert('Error', 'A group needs at least 2 members. Add a friend or member.');
      return;
    }

    setLoading(true);
    try {
      const members: GroupMember[] = [
        { id: uuidv4(), userId: user.id, name: user.name, email: user.email, phone: user.phone },
      ];

      friends.forEach((f) => {
        if (selectedFriends.has(f.id)) {
          members.push({
            id: uuidv4(), userId: f.friendId, name: f.friendName,
            email: f.friendEmail, phone: f.friendPhone,
          });
        }
      });

      manualMembers.forEach((m) => members.push(m));

      haptic.success();
      await createGroup({
        name: name.trim(),
        type,
        members,
        simplifyDebts: true,
        defaultCurrency: user.defaultCurrency || 'USD',
      });

      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && { alignSelf: 'center', width: contentMaxWidth },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Group Name"
          placeholder="e.g. Road Trip, Apartment..."
          value={name}
          onChangeText={setName}
          leftIcon="group"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
        <View style={styles.typeRow}>
          {GROUP_TYPES.map((t) => (
            <TouchableOpacity
              key={t.type}
              style={[
                styles.typeChip,
                {
                  backgroundColor: type === t.type ? t.color + '20' : colors.surface,
                  borderColor: type === t.type ? t.color : colors.border,
                },
              ]}
              onPress={() => { haptic.selection(); setType(t.type); }}
            >
              <MaterialIcons name={t.icon as any} size={22} color={t.color} />
              <Text style={[styles.typeLabel, { color: type === t.type ? t.color : colors.textSecondary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {linkedFriends.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Add Friends</Text>
            {linkedFriends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={[styles.friendRow, { borderBottomColor: colors.borderLight }]}
                onPress={() => { haptic.selection(); toggleFriend(friend.id); }}
              >
                <Avatar name={friend.friendName} size={36} />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { color: colors.text }]}>{friend.friendName}</Text>
                  <Text style={[styles.friendContact, { color: colors.textTertiary }]}>
                    {friend.friendEmail || friend.friendPhone || 'No contact info'}
                  </Text>
                </View>
                <MaterialIcons
                  name={selectedFriends.has(friend.id) ? 'check-circle' : 'radio-button-unchecked'}
                  size={24}
                  color={selectedFriends.has(friend.id) ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Add New Member</Text>
          <Input
            placeholder="Name"
            value={memberName}
            onChangeText={setMemberName}
            leftIcon="person"
          />
          <Input
            placeholder="Email or Phone number"
            value={memberContact}
            onChangeText={setMemberContact}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="contact-mail"
          />
          <Button
            title="Add Member"
            onPress={addManualMember}
            variant="outline"
            size="small"
            disabled={!memberName.trim()}
            icon={<MaterialIcons name="person-add" size={18} color={!memberName.trim() ? colors.textTertiary : colors.primary} />}
          />
        </View>

        {manualMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Added Members ({manualMembers.length})
            </Text>
            {manualMembers.map((m) => (
              <View key={m.id} style={[styles.friendRow, { borderBottomColor: colors.borderLight }]}>
                <Avatar name={m.name} size={36} />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { color: colors.text }]}>{m.name}</Text>
                  <Text style={[styles.friendContact, { color: colors.textTertiary }]}>
                    {m.email || m.phone || 'No contact info'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setManualMembers(manualMembers.filter((mm) => mm.id !== m.id))}>
                  <MaterialIcons name="close" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={isWide ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined}>
          <Button
            title="Create Group"
            onPress={handleCreate}
            loading={loading}
            fullWidth
            size="large"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  section: { marginTop: 8 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '500' },
  friendContact: { fontSize: 12, marginTop: 1 },
  bottomBar: { padding: 16, borderTopWidth: 1 },
});
