/**
 * FX (currency conversion) service with in-memory + persisted cache.
 * Uses Frankfurter API (no API key): https://www.frankfurter.dev/
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'fxRates:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const API_BASE = 'https://api.frankfurter.app';

interface CachedRate {
  rate: number;
  updatedAt: string;
}

const memoryCache = new Map<string, CachedRate>();

function cacheKey(from: string, to: string, date?: string): string {
  const d = date || new Date().toISOString().split('T')[0];
  return `${CACHE_PREFIX}${from}_${to}_${d}`;
}

async function getCached(from: string, to: string): Promise<CachedRate | null> {
  const key = cacheKey(from, to);
  const mem = memoryCache.get(key);
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    if (age > CACHE_TTL_MS) return null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function setCached(from: string, to: string, rate: number, updatedAt: string): Promise<void> {
  const key = cacheKey(from, to);
  const entry: CachedRate = { rate, updatedAt };
  memoryCache.set(key, entry);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (_) {}
}

/** Fetch rate from API (from -> to). */
async function fetchRate(from: string, to: string): Promise<{ rate: number; updatedAt: string }> {
  const url = `${API_BASE}/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FX rate unavailable (${res.status}). Try again later.`);
  }
  const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
  const rate = data.rates?.[to];
  if (rate == null || typeof rate !== 'number') {
    throw new Error(`FX rate not found for ${from} → ${to}.`);
  }
  const updatedAt = data.date ? `${data.date}T12:00:00.000Z` : new Date().toISOString();
  return { rate, updatedAt };
}

/**
 * Get exchange rate from `from` to `to`. Uses cache first, then API.
 */
export async function getRate(
  from: string,
  to: string
): Promise<{ rate: number; updatedAt: string }> {
  const fromNorm = from.toUpperCase();
  const toNorm = to.toUpperCase();
  if (fromNorm === toNorm) {
    return { rate: 1, updatedAt: new Date().toISOString() };
  }

  const cached = await getCached(fromNorm, toNorm);
  if (cached) return cached;

  const { rate, updatedAt } = await fetchRate(fromNorm, toNorm);
  await setCached(fromNorm, toNorm, rate, updatedAt);
  return { rate, updatedAt };
}

/**
 * Convert amount from one currency to another. Returns converted amount and rate used.
 */
export async function convert(
  amount: number,
  from: string,
  to: string
): Promise<{ amount: number; rate: number; updatedAt: string }> {
  const { rate, updatedAt } = await getRate(from, to);
  const converted = Math.round(amount * rate * 100) / 100;
  return { amount: converted, rate, updatedAt };
}
