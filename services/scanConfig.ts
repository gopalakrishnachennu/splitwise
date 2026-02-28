/**
 * Receipt Scanning Configuration — Gemini Vision API
 *
 * Get your free API key at: https://aistudio.google.com/apikey
 * 1. Sign in with your Google account
 * 2. Click "Create API Key"
 * 3. Pick your Google Cloud project (or create one)
 * 4. Copy the key and paste it below
 *
 * This is NOT the same key you used for Cloud Functions.
 * That was a custom key you created yourself.
 * This is a Google AI Studio key for the Gemini API.
 */
export const ReceiptScanConfig = {
  /** Gemini API key from https://aistudio.google.com/apikey */
  geminiApiKey: 'AIzaSyCfaUKMhvGZF_AvGJFsE4DF46ITG0ngGYM',

  /** Model to use — gemini-2.0-flash is fastest + cheapest */
  model: 'gemini-2.5-flash',

  /** Max time to wait for Gemini response (ms) */
  timeoutMs: 15_000,
};
