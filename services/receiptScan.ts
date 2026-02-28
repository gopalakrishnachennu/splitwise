/**
 * Receipt scanning using Gemini Vision API (direct REST call).
 * Uses fetch() directly instead of the SDK for React Native compatibility.
 * Single API call: image → structured JSON (merchant, items, total).
 * ~1-2 sec response time.
 */

import { ReceiptScanConfig } from '@/services/scanConfig';

// ── Types ──────────────────────────────────────────────────────────

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
  currency?: string;
}

// ── Image preparation (pure JS — no Expo native modules) ───────────

async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix
      const base64 = dataUrl.split(',')[1] || dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Gemini Vision prompt ───────────────────────────────────────────

const RECEIPT_PROMPT = `You are a receipt parser. Analyze this receipt image and extract the following information as JSON.

Return ONLY valid JSON with this exact structure, no markdown, no extra text, no code fences:
{
  "merchant": "Store/restaurant name",
  "currency": "USD",
  "items": [
    { "description": "Item name", "amount": 12.99 }
  ],
  "total": 45.99
}

Rules:
- "merchant": the store/restaurant name. If unclear, use "Receipt".
- "currency": the 3-letter currency code (USD, EUR, GBP, INR, etc). Default "USD" if unclear.
- "items": individual line items with their prices. Skip tax/tip/discount lines.
- "total": the final total amount. If no total line, sum the items.
- All amounts must be numbers, not strings.
- If you cannot read the receipt at all, return: { "merchant": "Receipt", "currency": "USD", "items": [], "total": 0 }`;

// ── Gemini REST API call (direct fetch, no SDK) ────────────────────

interface GeminiReceiptResponse {
  merchant: string;
  currency?: string;
  items: { description: string; amount: number }[];
  total: number | null;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGeminiVision(imageBase64: string): Promise<GeminiReceiptResponse> {
  if (!ReceiptScanConfig.geminiApiKey || ReceiptScanConfig.geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. Get a free key at https://aistudio.google.com/apikey and add it to services/scanConfig.ts'
    );
  }

  const url = `${GEMINI_API_URL}/${ReceiptScanConfig.model}:generateContent?key=${ReceiptScanConfig.geminiApiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: RECEIPT_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ReceiptScanConfig.timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Receipt scanning timed out. Please try again.');
    }
    throw new Error(`Network error: ${err?.message || 'Could not reach Gemini API'}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.error('Gemini API error:', res.status, errorText);
    if (res.status === 400) {
      throw new Error('Invalid request to Gemini API. The image may be too large or corrupted.');
    }
    if (res.status === 403) {
      throw new Error('Gemini API key is invalid or does not have access. Check your key at aistudio.google.com');
    }
    if (res.status === 429) {
      throw new Error('Too many requests. Wait a moment and try again.');
    }
    throw new Error(`Gemini API error (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();

  // Extract the text content from Gemini's response structure
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    console.error('Unexpected Gemini response:', JSON.stringify(data).slice(0, 500));
    throw new Error('No data returned from Gemini. Try a clearer photo.');
  }

  // Parse the JSON response — strip code fences if present
  let jsonStr = textContent.trim();
  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    jsonStr = fenced[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as GeminiReceiptResponse;
  } catch (parseErr) {
    console.error('Failed to parse Gemini response:', jsonStr.slice(0, 300));
    throw new Error('Could not parse receipt data. Please try a clearer photo.');
  }
}

// ── Public API (same interface as before) ──────────────────────────

/**
 * Full scan: image → Gemini Vision → structured result.
 * Single API call, ~1-2 sec response time.
 */
export async function scanReceipt(imageUri: string): Promise<ReceiptScanResult> {
  const imageBase64 = await uriToBase64(imageUri);
  const geminiResult = await callGeminiVision(imageBase64);

  // Map to our ReceiptScanResult format
  const items: ReceiptLineItem[] = (geminiResult.items || []).map((item, i) => ({
    id: `line-${i}-${Date.now()}`,
    description: item.description || '',
    amount: typeof item.amount === 'number' ? Math.round(item.amount * 100) / 100 : 0,
  }));

  let total = geminiResult.total;
  if (total == null && items.length > 0) {
    total = Math.round(items.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;
  }

  return {
    merchant: geminiResult.merchant || 'Receipt',
    total,
    items,
    rawText: JSON.stringify(geminiResult, null, 2),
    currency: geminiResult.currency || 'USD',
  };
}
