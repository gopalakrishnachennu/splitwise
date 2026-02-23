import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, useWindowDimensions, Modal, TextInput,
  FlatList, Platform, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useThemeColors, useDeviceType } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';
import { CURRENCIES, getCurrencyInfo } from '@/constants/Currencies';

type ModalType = 'none' | 'currency' | 'language' | 'theme' | 'editProfile' | 'faq' | 'about' | 'privacy' | 'terms';

export default function AccountScreen() {
  const colors = useThemeColors();
  const deviceType = useDeviceType();
  const { width } = useWindowDimensions();
  const { user, logout, updateProfile } = useAuthStore();

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const [notifications, setNotifications] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [editName, setEditName] = useState(user?.name || '');
  const [currencySearch, setCurrencySearch] = useState('');

  const themeLabelMap: Record<string, string> = { system: 'System', light: 'Light', dark: 'Dark' };
  const selectedTheme = themeLabelMap[themeMode] || 'System';

  const isWide = deviceType !== 'phone';
  const contentMaxWidth = isWide ? 600 : width;
  const currencyInfo = getCurrencyInfo(user?.defaultCurrency || 'USD');

  const openModal = (type: ModalType) => { haptic.light(); setActiveModal(type); };
  const closeModal = () => setActiveModal('none');

  const handleLogout = () => {
    haptic.warning();
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { haptic.heavy(); await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const handleCurrencySelect = async (code: string) => {
    haptic.selection();
    await updateProfile({ defaultCurrency: code });
    closeModal();
  };

  const handleThemeSelect = async (label: string) => {
    haptic.selection();
    const modeMap: Record<string, 'system' | 'light' | 'dark'> = { System: 'system', Light: 'light', Dark: 'dark' };
    await setThemeMode(modeMap[label] || 'system');
    closeModal();
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      haptic.error();
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    haptic.success();
    await updateProfile({ name: editName.trim() });
    closeModal();
  };

  const handleNotificationToggle = (val: boolean) => {
    haptic.selection();
    setNotifications(val);
    Alert.alert(val ? 'Notifications Enabled' : 'Notifications Disabled',
      val ? 'You will receive expense and group notifications.' : 'Notifications have been turned off.');
  };

  const filteredCurrencies = currencySearch.trim()
    ? CURRENCIES.filter(c => c.name.toLowerCase().includes(currencySearch.toLowerCase()) || c.code.toLowerCase().includes(currencySearch.toLowerCase()))
    : CURRENCIES;

  const MenuItem = ({ icon, label, value, onPress, isDestructive, rightElement }: {
    icon: string; label: string; value?: string; onPress?: () => void;
    isDestructive?: boolean; rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.menuIcon, { backgroundColor: isDestructive ? colors.error + '15' : colors.primaryLight }]}>
        <MaterialIcons name={icon as any} size={20} color={isDestructive ? colors.error : colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: isDestructive ? colors.error : colors.text }]}>{label}</Text>
        {value && <Text style={[styles.menuValue, { color: colors.textTertiary }]}>{value}</Text>}
      </View>
      {rightElement || (onPress && <MaterialIcons name="chevron-right" size={22} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );

  const ModalWrapper = ({ visible, title, children }: { visible: boolean; title: string; children: React.ReactNode }) => (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, maxWidth: isWide ? 500 : width - 32 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={closeModal} style={[styles.modalClose, { backgroundColor: colors.surfaceVariant }]}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={isWide ? { alignSelf: 'center', width: contentMaxWidth } : undefined}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Avatar name={user?.name || 'U'} size={72} />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primaryLight }]}
          onPress={() => { setEditName(user?.name || ''); openModal('editProfile'); }}
        >
          <MaterialIcons name="edit" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Preferences */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <MenuItem icon="attach-money" label="Default Currency" value={`${currencyInfo.flag} ${currencyInfo.code}`} onPress={() => { setCurrencySearch(''); openModal('currency'); }} />
        <MenuItem icon="notifications" label="Notifications" rightElement={
          <Switch value={notifications} onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={notifications ? colors.primary : colors.textTertiary} />
        } />
        <MenuItem icon="language" label="Language" value="English" onPress={() => openModal('language')} />
        <MenuItem icon="dark-mode" label="Theme" value={selectedTheme} onPress={() => openModal('theme')} />
      </View>

      {/* Features */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FEATURES</Text>
        <MenuItem icon="bar-chart" label="Charts & Reports" onPress={() => router.push('/charts')} />
        <MenuItem icon="search" label="Search Expenses" onPress={() => router.push('/search')} />
      </View>

      {/* Support */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        <MenuItem icon="help-outline" label="FAQ & Help" onPress={() => openModal('faq')} />
        <MenuItem icon="info-outline" label="About" value="v1.0.0" onPress={() => openModal('about')} />
        <MenuItem icon="privacy-tip" label="Privacy Policy" onPress={() => openModal('privacy')} />
        <MenuItem icon="description" label="Terms of Service" onPress={() => openModal('terms')} />
      </View>

      {/* Logout */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <MenuItem icon="logout" label="Log Out" onPress={handleLogout} isDestructive />
      </View>

      <View style={{ height: 100 }} />

      {/* ======== MODALS ======== */}

      {/* Currency Picker */}
      <ModalWrapper visible={activeModal === 'currency'} title="Default Currency">
        <TextInput
          style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
          placeholder="Search currencies..."
          placeholderTextColor={colors.textTertiary}
          value={currencySearch}
          onChangeText={setCurrencySearch}
        />
        <FlatList
          data={filteredCurrencies}
          keyExtractor={(item) => item.code}
          style={{ maxHeight: 400 }}
          renderItem={({ item }) => {
            const isSelected = item.code === (user?.defaultCurrency || 'USD');
            return (
              <TouchableOpacity
                style={[styles.currencyRow, isSelected && { backgroundColor: colors.primaryLight }]}
                onPress={() => handleCurrencySelect(item.code)}
              >
                <Text style={styles.currencyFlag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
                  <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{item.name}</Text>
                </View>
                <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>{item.symbol}</Text>
                {isSelected && <MaterialIcons name="check-circle" size={20} color={colors.primary} style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          }}
        />
      </ModalWrapper>

      {/* Language */}
      <ModalWrapper visible={activeModal === 'language'} title="Language">
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Select your preferred language for the app interface.
        </Text>
        {['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Chinese', 'Portuguese'].map((lang) => {
          const isSelected = lang === 'English';
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.optionRow, isSelected && { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                if (lang !== 'English') {
                  haptic.warning();
                  Alert.alert('Coming Soon', `${lang} language support will be available in a future update.`);
                } else {
                  haptic.selection();
                  closeModal();
                }
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{lang}</Text>
              {isSelected && <MaterialIcons name="check-circle" size={20} color={colors.primary} />}
              {!isSelected && <Text style={[styles.comingSoon, { color: colors.textTertiary }]}>Coming soon</Text>}
            </TouchableOpacity>
          );
        })}
      </ModalWrapper>

      {/* Theme */}
      <ModalWrapper visible={activeModal === 'theme'} title="Theme">
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Choose how Splitwise looks on your device.
        </Text>
        {[
          { key: 'System', icon: 'settings-suggest', desc: 'Follows your device settings' },
          { key: 'Light', icon: 'light-mode', desc: 'Always use light theme' },
          { key: 'Dark', icon: 'dark-mode', desc: 'Always use dark theme' },
        ].map((theme) => {
          const isSelected = selectedTheme === theme.key;
          return (
            <TouchableOpacity
              key={theme.key}
              style={[styles.themeRow, isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => handleThemeSelect(theme.key)}
            >
              <View style={[styles.themeIcon, { backgroundColor: isSelected ? colors.primary + '20' : colors.surfaceVariant }]}>
                <MaterialIcons name={theme.icon as any} size={22} color={isSelected ? colors.primary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeLabel, { color: colors.text }]}>{theme.key}</Text>
                <Text style={[styles.themeDesc, { color: colors.textTertiary }]}>{theme.desc}</Text>
              </View>
              {isSelected && <MaterialIcons name="check-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </ModalWrapper>

      {/* Edit Profile */}
      <ModalWrapper visible={activeModal === 'editProfile'} title="Edit Profile">
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Display Name</Text>
        <TextInput
          style={[styles.profileInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
          value={editName}
          onChangeText={setEditName}
          placeholder="Enter your name"
          placeholderTextColor={colors.textTertiary}
          autoFocus
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>Email</Text>
        <View style={[styles.profileInput, { borderColor: colors.border, backgroundColor: colors.surfaceVariant, justifyContent: 'center' }]}>
          <Text style={[{ color: colors.textTertiary, fontSize: 15 }]}>{user?.email}</Text>
        </View>
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>Email cannot be changed</Text>

        <View style={styles.modalBtnRow}>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]} onPress={closeModal}>
            <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile}>
            <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ModalWrapper>

      {/* FAQ & Help */}
      <ModalWrapper visible={activeModal === 'faq'} title="FAQ & Help">
        <ScrollView style={{ maxHeight: 450 }}>
          {[
            { q: 'How do I add an expense?', a: 'Tap the "+" button on the Dashboard or go to any group and tap "Add Expense". Fill in the description, amount, and choose how to split it.' },
            { q: 'How do I create a group?', a: 'Go to the Groups tab and tap "Create Group". Add a name, choose a type (Home, Trip, Couple, etc.), and add members by their email or phone number.' },
            { q: 'How do I settle up?', a: 'Tap "Settle Up" on the Dashboard. Select the friend you want to settle with, enter the amount, and confirm the payment.' },
            { q: 'Can I use different currencies?', a: 'Yes! Go to Account > Default Currency to change your default. You can also set different currencies per expense when adding one.' },
            { q: 'Does the app work offline?', a: 'Yes. All data is stored locally on your device using SQLite. You can use the app without an internet connection.' },
            { q: 'How do I delete an expense?', a: 'Open the expense details by tapping on it, then use the delete button. You\'ll be asked to confirm before deletion.' },
            { q: 'How do I remove a friend?', a: 'Go to the friend\'s profile by tapping their name, then use the remove option. Note: you should settle any balances first.' },
            { q: 'Is my data safe?', a: 'Your data is stored locally on your device. Passwords are hashed before storage. We do not transmit any financial data to external servers.' },
          ].map((faq, idx) => (
            <View key={idx} style={[styles.faqItem, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.faqQ, { color: colors.text }]}>{faq.q}</Text>
              <Text style={[styles.faqA, { color: colors.textSecondary }]}>{faq.a}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.helpBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => { closeModal(); Linking.openURL('mailto:support@splitwise.com'); }}
          >
            <MaterialIcons name="email" size={18} color={colors.primary} />
            <Text style={[styles.helpBtnText, { color: colors.primary }]}>Contact Support</Text>
          </TouchableOpacity>
        </ScrollView>
      </ModalWrapper>

      {/* About */}
      <ModalWrapper visible={activeModal === 'about'} title="About Splitwise">
        <View style={styles.aboutCenter}>
          <View style={[styles.aboutLogo, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="account-balance-wallet" size={36} color="#FFF" />
          </View>
          <Text style={[styles.aboutName, { color: colors.text }]}>Splitwise</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
        </View>
        {[
          { label: 'Build', value: '2026.02.23' },
          { label: 'Platform', value: Platform.OS.charAt(0).toUpperCase() + Platform.OS.slice(1) },
          { label: 'Framework', value: 'Expo SDK 54' },
          { label: 'Database', value: 'SQLite (Local)' },
          { label: 'Data Mode', value: 'Offline-first' },
        ].map((item, idx) => (
          <View key={idx} style={[styles.aboutRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.aboutVal, { color: colors.text }]}>{item.value}</Text>
          </View>
        ))}
        <Text style={[styles.aboutFooter, { color: colors.textTertiary }]}>
          Split expenses with friends, track balances, and settle debts — all without an internet connection.
        </Text>
      </ModalWrapper>

      {/* Privacy Policy */}
      <ModalWrapper visible={activeModal === 'privacy'} title="Privacy Policy">
        <ScrollView style={{ maxHeight: 450 }}>
          <Text style={[styles.legalTitle, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.legalDate, { color: colors.textTertiary }]}>Last updated: February 23, 2026</Text>
          {[
            { title: '1. Data Collection', body: 'Splitwise stores all your data locally on your device. We collect your name, email address, and optional phone number when you create an account. Financial data including expenses, groups, and settlements are stored exclusively in a local SQLite database on your device.' },
            { title: '2. Data Storage', body: 'All data is stored locally using SQLite and secure storage. Your password is hashed before storage. No financial data is transmitted to external servers. When using Google Sign-In, we receive your name, email, and profile picture from Google.' },
            { title: '3. Data Sharing', body: 'We do not sell, trade, or share your personal information with third parties. Your data remains on your device at all times.' },
            { title: '4. Data Deletion', body: 'You can delete your account and all associated data at any time by logging out. Since data is stored locally, clearing the app data or uninstalling the app will permanently remove all your information.' },
            { title: '5. Security', body: 'We use industry-standard security measures including password hashing and secure storage for sensitive data like authentication tokens. However, since data is stored locally, device security is your responsibility.' },
            { title: '6. Contact', body: 'For privacy-related questions, contact us at privacy@splitwise.com.' },
          ].map((section, idx) => (
            <View key={idx} style={styles.legalSection}>
              <Text style={[styles.legalSectionTitle, { color: colors.text }]}>{section.title}</Text>
              <Text style={[styles.legalBody, { color: colors.textSecondary }]}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </ModalWrapper>

      {/* Terms of Service */}
      <ModalWrapper visible={activeModal === 'terms'} title="Terms of Service">
        <ScrollView style={{ maxHeight: 450 }}>
          <Text style={[styles.legalTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.legalDate, { color: colors.textTertiary }]}>Last updated: February 23, 2026</Text>
          {[
            { title: '1. Acceptance', body: 'By using Splitwise, you agree to these Terms of Service. If you do not agree, please do not use the app.' },
            { title: '2. Account', body: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. Only Gmail addresses (@gmail.com) are accepted for registration.' },
            { title: '3. Use of Service', body: 'Splitwise is designed to help you track shared expenses and settle debts with friends. The app does not process actual financial transactions. Settlement tracking is for informational purposes only.' },
            { title: '4. Data Ownership', body: 'You retain full ownership of all data you enter into the app. Since all data is stored locally on your device, you are responsible for backing up your data.' },
            { title: '5. Prohibited Uses', body: 'You may not use the app for illegal activities, money laundering, fraud, or any purpose that violates applicable laws. You may not attempt to reverse-engineer, hack, or compromise the application.' },
            { title: '6. Limitation of Liability', body: 'Splitwise is provided "as is" without warranties. We are not liable for any financial losses, data loss, or damages arising from the use of this app. Always verify balances independently.' },
            { title: '7. Changes', body: 'We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.' },
            { title: '8. Contact', body: 'For questions about these terms, contact us at legal@splitwise.com.' },
          ].map((section, idx) => (
            <View key={idx} style={styles.legalSection}>
              <Text style={[styles.legalSectionTitle, { color: colors.text }]}>{section.title}</Text>
              <Text style={[styles.legalBody, { color: colors.textSecondary }]}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </ModalWrapper>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 20, borderRadius: 16, borderWidth: 1 },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '700' },
  profileEmail: { fontSize: 14, marginTop: 2 },
  editButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, padding: 16, paddingBottom: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1, marginLeft: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuValue: { fontSize: 13, marginTop: 1 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // Currency
  searchInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, gap: 10 },
  currencyFlag: { fontSize: 24 },
  currencyCode: { fontSize: 15, fontWeight: '600' },
  currencyName: { fontSize: 12, marginTop: 1 },
  currencySymbol: { fontSize: 15, fontWeight: '500' },
  // Options
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  optionText: { fontSize: 15, fontWeight: '500' },
  comingSoon: { fontSize: 12 },
  infoText: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  // Theme
  themeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', marginBottom: 8, gap: 12 },
  themeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { fontSize: 15, fontWeight: '600' },
  themeDesc: { fontSize: 12, marginTop: 2 },
  // Edit Profile
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  profileInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  hintText: { fontSize: 11, marginTop: 4 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  // FAQ
  faqItem: { paddingVertical: 14, borderBottomWidth: 0.5 },
  faqQ: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  faqA: { fontSize: 14, lineHeight: 20 },
  helpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8, marginTop: 16, marginBottom: 8 },
  helpBtnText: { fontSize: 14, fontWeight: '600' },
  // About
  aboutCenter: { alignItems: 'center', marginBottom: 20 },
  aboutLogo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  aboutName: { fontSize: 22, fontWeight: '800' },
  aboutVersion: { fontSize: 14, marginTop: 2 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5 },
  aboutLabel: { fontSize: 14 },
  aboutVal: { fontSize: 14, fontWeight: '600' },
  aboutFooter: { fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  // Legal
  legalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  legalDate: { fontSize: 12, marginBottom: 16 },
  legalSection: { marginBottom: 16 },
  legalSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  legalBody: { fontSize: 14, lineHeight: 21 },
});
