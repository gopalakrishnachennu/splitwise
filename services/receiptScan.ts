/**
 * Receipt scanning and itemization using Google ML Kit (expo-text-recognition).
 * Parses OCR text into line items and total for pro-style receipt workflow.
 */

import { Platform } from 'react-native';

export interface ReceiptLineItem {
  id: string;
  description: string;
  amount: number;
  raw?: string;
}

export interface ReceiptScanResult {
  merchant: string;
  total: number | null;
  items: ReceiptLineItem[];
  rawText: string;
}

const AMOUNT_REGEX = /[\d,]+\.?\d*/;
const LINE_WITH_AMOUNT = /^(.+?)\s+([\$€£]?\s*[\d,]+\.\d{2})\s*$/;
const TOTAL_LINE = /(?:total|balance due|amount due|grand total|subtotal)\s*[:]?\s*[\$€£]?\s*([\d,]+\.\d{2})/i;

let _textRecognition: { getTextFromFrame: (uri: string, isBase64?: boolean) => Promise<string> } | null = null;

async function getOCR(): Promise<typeof _textRecognition> {
  if (_textRecognition) return _textRecognition;
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('expo-text-recognition');
    _textRecognition = { getTextFromFrame: mod.getTextFromFrame };
    return _textRecognition;
  } catch {
    return null;
  }
}

/**
 * Run OCR on a receipt image (file URI). Returns raw text or empty string if OCR not available.
 */
export async function extractTextFromReceipt(imageUri: string): Promise<string> {
  const ocr = await getOCR();
  if (!ocr) return '';
  try {
    const text = await ocr.getTextFromFrame(imageUri, false);
    return typeof text === 'string' ? text : '';
  } catch (e) {
    console.warn('Receipt OCR failed:', e);
    return '';
  }
}

/**
 * Parse raw receipt text into structured items and total.
 * Handles common formats: "Item Name    12.99", "Total  45.00", etc.
 */
export function parseReceiptText(rawText: string): Omit<ReceiptScanResult, 'rawText'> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ReceiptLineItem[] = [];
  let total: number | null = null;
  let merchant = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const totalMatch = line.match(TOTAL_LINE);
    if (totalMatch) {
      const value = parseFloat(totalMatch[1].replace(/,/g, ''));
      if (!isNaN(value)) total = value;
      continue;
    }

    const lineMatch = line.match(LINE_WITH_AMOUNT);
    if (lineMatch) {
      const desc = lineMatch[1].trim().replace(/\s+/g, ' ');
      const amountStr = lineMatch[2].replace(/[\$€£\s]/g, '').replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount < 100000 && desc.length > 0) {
        const skip = /^(total|subtotal|tax|vat|tip|discount|balance)/i.test(desc);
        if (!skip) {
          items.push({
            id: `line-${i}-${Date.now()}`,
            description: desc,
            amount: Math.round(amount * 100) / 100,
            raw: line,
          });
        }
      }
      continue;
    }

    const amountAtEnd = line.match(/\s+([\$€£]?\s*[\d,]+\.\d{2})\s*$/);
    if (amountAtEnd) {
      const desc = line.replace(/\s+[\$€£]?\s*[\d,]+\.\d{2}\s*$/, '').trim().replace(/\s+/g, ' ');
      const amount = parseFloat(amountAtEnd[1].replace(/[\$€£\s,]/g, ''));
      if (!isNaN(amount) && amount < 100000 && desc.length > 0) {
        const skip = /^(total|subtotal|tax|vat|tip|discount|balance)/i.test(desc);
        if (!skip) {
          items.push({
            id: `line-${i}-${Date.now()}`,
            description: desc,
            amount: Math.round(amount * 100) / 100,
            raw: line,
          });
        }
      }
      continue;
    }

    if (i === 0 && line.length < 60 && !AMOUNT_REGEX.test(line)) {
      merchant = line;
    }
  }

  if (total === null && items.length > 0) {
    const sum = items.reduce((s, i) => s + i.amount, 0);
    total = Math.round(sum * 100) / 100;
  }

  return { merchant: merchant || 'Receipt', total, items };
}

/**
 * Full scan: OCR + parse. Returns structured result for UI.
 */
export async function scanReceipt(imageUri: string): Promise<ReceiptScanResult> {
  const rawText = await extractTextFromReceipt(imageUri);
  const parsed = parseReceiptText(rawText);
  return { ...parsed, rawText };
}
