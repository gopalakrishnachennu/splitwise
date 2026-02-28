import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/utils/hooks';
import { haptic } from '@/utils/haptics';
import { useExpenseStore } from '@/stores/useExpenseStore';
import {
  scanReceipt,
  ReceiptScanResult,
  ReceiptLineItem,
} from '@/services/receiptScan';
import { sanitizeDecimalInput } from '@/utils/validation';

const isWeb = Platform.OS === 'web';

export default function ReceiptScanScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const setReceiptScanPrefill = useExpenseStore((s) => s.setReceiptScanPrefill);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [merchant, setMerchant] = useState('');
  const [items, setItems] = useState<ReceiptLineItem[]>([]);
  const [total, setTotal] = useState<string>('');

  const pickImage = useCallback(async (useCamera: boolean) => {
    setError(null);
    setResult(null);
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Camera access is required to scan receipts.');
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Photo library access is required.');
        return;
      }
    }
    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      })
      : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });
    if (!pickerResult.canceled && pickerResult.assets[0]) {
      haptic.success();
      const uri = pickerResult.assets[0].uri;
      setImageUri(uri);
      setResult(null);
      autoScan(uri);
    }
  }, []);

  const handleScanResult = useCallback((scanResult: ReceiptScanResult) => {
    setResult(scanResult);
    setMerchant(scanResult.merchant || '');
    setItems(
      scanResult.items.map((i) => ({
        ...i,
        id: i.id || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })),
    );
    setTotal(scanResult.total != null ? String(scanResult.total) : '');
    haptic.success();
  }, []);

  const handleScanError = useCallback((e: any) => {
    console.warn('Receipt scan error:', e);
    const msg = typeof e?.message === 'string' ? e.message : 'Unknown error';
    // Show the actual error message — receiptScan.ts now has specific messages
    // for each failure case (API key, timeout, parsing, HTTP errors)
    setError(msg);
    haptic.error();
  }, []);

  const autoScan = useCallback(async (uri: string) => {
    setScanning(true);
    setError(null);
    try {
      const scanResult = await scanReceipt(uri);
      handleScanResult(scanResult);
    } catch (e: any) {
      handleScanError(e);
    } finally {
      setScanning(false);
    }
  }, [handleScanResult, handleScanError]);

  const runScan = useCallback(async () => {
    if (!imageUri) return;
    await autoScan(imageUri);
  }, [imageUri, autoScan]);

  const updateItem = useCallback((id: string, updates: Partial<ReceiptLineItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    haptic.light();
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const addItem = useCallback(() => {
    haptic.light();
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        description: '',
        amount: 0,
      },
    ]);
  }, []);

  const applyToExpense = useCallback(() => {
    const desc = merchant.trim() || (items[0]?.description?.trim()) || 'Receipt';
    const amountVal = total.trim() ? parseFloat(total) : items.reduce((s, i) => s + i.amount, 0);
    if (!imageUri) return;
    if (amountVal <= 0 || isNaN(amountVal)) {
      Alert.alert('Invalid total', 'Enter a valid total amount or add line items.');
      return;
    }
    haptic.success();
    setReceiptScanPrefill({
      description: desc,
      amount: amountVal.toFixed(2),
      receiptUri: imageUri,
    });
    router.back();
  }, [merchant, items, total, imageUri, setReceiptScanPrefill]);

  const useImageOnly = useCallback(() => {
    if (!imageUri) return;
    haptic.success();
    setReceiptScanPrefill({
      description: '',
      amount: '',
      receiptUri: imageUri,
    });
    router.back();
  }, [imageUri, setReceiptScanPrefill]);

  const computedTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const displayTotal = total.trim() ? parseFloat(total) : computedTotal;
  const hasItems = items.length > 0;
  const canApply = !!imageUri && displayTotal > 0 && !isNaN(displayTotal);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <MaterialIcons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Scan receipt</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!imageUri ? (
          <>
            <View style={styles.hero}>
              <View style={[styles.heroIconWrap, { backgroundColor: colors.primaryLight }]}>
                <MaterialIcons name="document-scanner" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Scan a receipt</Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                We'll extract items and total instantly using AI.
              </Text>
              <View style={styles.heroActions}>
                {!isWeb && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => pickImage(true)}
                  >
                    <MaterialIcons name="camera-alt" size={22} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Take photo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[isWeb ? styles.primaryBtn : styles.secondaryBtn, isWeb ? { backgroundColor: colors.primary } : { borderColor: colors.primary }]}
                  onPress={() => pickImage(false)}
                >
                  <MaterialIcons name="photo-library" size={22} color={isWeb ? '#FFF' : colors.primary} />
                  <Text style={[isWeb ? styles.primaryBtnText : styles.secondaryBtnText, !isWeb && { color: colors.primary }]}>Choose from library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.previewCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.changePhotoBtn, { backgroundColor: colors.overlay }]}
                onPress={() => { setImageUri(null); setResult(null); setError(null); setItems([]); setMerchant(''); setTotal(''); }}
              >
                <MaterialIcons name="photo-camera" size={20} color="#FFF" />
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>
              <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="contain" />
              {!result && (
                <TouchableOpacity
                  style={[styles.scanOverlay, { backgroundColor: colors.overlay }]}
                  onPress={runScan}
                  disabled={scanning}
                >
                  {scanning ? (
                    <View style={styles.scanOverlayContent}>
                      <ActivityIndicator size="large" color="#FFF" />
                      <Text style={styles.scanOverlayText}>Extracting items…</Text>
                    </View>
                  ) : (
                    <View style={styles.scanOverlayContent}>
                      <MaterialIcons name="document-scanner" size={40} color="#FFF" />
                      <Text style={styles.scanOverlayText}>Tap to re-scan</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                <MaterialIcons name="error-outline" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            {(result || hasItems) && imageUri && (
              <>
                <View style={[styles.section, { borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Merchant / Description</Text>
                  <TextInput
                    style={[styles.merchantInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="Store or expense name"
                    placeholderTextColor={colors.textTertiary}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                <View style={[styles.section, { borderColor: colors.border }]}>
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Line items</Text>
                    {!isWeb && (
                      <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                        <MaterialIcons name="add" size={20} color={colors.primary} />
                        <Text style={[styles.addItemText, { color: colors.primary }]}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {items.length === 0 ? (
                    <Text style={[styles.emptyItems, { color: colors.textTertiary }]}>No items extracted. Add manually or use total only.</Text>
                  ) : (
                    items.map((item) => (
                      <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.borderLight }]}>
                        <TextInput
                          style={[styles.itemDesc, { color: colors.text }]}
                          placeholder="Description"
                          placeholderTextColor={colors.textTertiary}
                          value={item.description}
                          onChangeText={(t) => updateItem(item.id, { description: t })}
                        />
                        <TextInput
                          style={[styles.itemAmount, { color: colors.text }]}
                          placeholder="0.00"
                          placeholderTextColor={colors.textTertiary}
                          value={item.amount ? String(item.amount) : ''}
                          onChangeText={(t) => {
                            const s = sanitizeDecimalInput(t);
                            updateItem(item.id, { amount: parseFloat(s) || 0 });
                          }}
                          keyboardType="decimal-pad"
                        />
                        <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={8} style={styles.removeItemBtn}>
                          <MaterialIcons name="close" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                <View style={[styles.section, { borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Total</Text>
                  <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.currencySign, { color: colors.text }]}>$</Text>
                    <TextInput
                      style={[styles.totalInput, { color: colors.text }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textTertiary}
                      value={total}
                      onChangeText={(t) => setTotal(sanitizeDecimalInput(t))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {items.length > 0 && (
                    <Text style={[styles.totalHint, { color: colors.textTertiary }]}>
                      Sum of items: ${computedTotal.toFixed(2)}
                    </Text>
                  )}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.applyBtn, { backgroundColor: colors.primary }]}
                    onPress={applyToExpense}
                    disabled={!canApply}
                  >
                    <MaterialIcons name="check" size={22} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Use for expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                    onPress={useImageOnly}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Use image only</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  webNotice: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  webNoticeText: {
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  heroActions: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    gap: 10,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 220,
    marginBottom: 20,
    position: 'relative',
  },
  changePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  previewImg: {
    width: '100%',
    height: 280,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanOverlayContent: {
    alignItems: 'center',
    gap: 12,
  },
  scanOverlayText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  merchantInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyItems: {
    fontSize: 15,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemDesc: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  itemAmount: {
    width: 90,
    fontSize: 16,
    paddingVertical: 6,
    textAlign: 'right',
  },
  removeItemBtn: {
    padding: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 8,
  },
  currencySign: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 6,
  },
  totalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 6,
  },
  totalHint: {
    fontSize: 13,
    marginTop: 6,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  applyBtn: {
    paddingVertical: 18,
  },
});
