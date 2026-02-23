import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import * as db from '@/services/database';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleUser: { email: string; name: string; photo?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isGmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@gmail.com');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      if (!email.trim()) return { success: false, error: 'Please enter your email' };
      if (!isValidEmail(email.trim())) return { success: false, error: 'Please enter a valid email address' };
      if (!isGmail(email.trim())) return { success: false, error: 'Only Gmail addresses (@gmail.com) are allowed' };
      if (!password) return { success: false, error: 'Please enter your password' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

      const user = await db.getUserByEmail(email.trim());
      if (!user) {
        return { success: false, error: 'No account found with this email. Please sign up first.' };
      }

      const passwordValid = await db.verifyPassword(email.trim(), password);
      if (!passwordValid) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      await storage.setItem('userId', user.id);
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  },

  signup: async (name: string, email: string, password: string, phone?: string) => {
    try {
      if (!name.trim()) return { success: false, error: 'Please enter your name' };
      if (name.trim().length < 2) return { success: false, error: 'Name must be at least 2 characters' };
      if (!email.trim()) return { success: false, error: 'Please enter your email' };
      if (!isValidEmail(email.trim())) return { success: false, error: 'Please enter a valid email address' };
      if (!isGmail(email.trim())) return { success: false, error: 'Only Gmail addresses (@gmail.com) are allowed' };
      if (!password) return { success: false, error: 'Please enter a password' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

      const existing = await db.getUserByEmail(email.trim());
      if (existing) {
        return { success: false, error: 'This email is already registered. Please log in instead.' };
      }

      const user = await db.createUser({
        email: email.trim(),
        name: name.trim(),
        phone: phone?.trim() || undefined,
        defaultCurrency: 'USD',
        password,
      });

      await storage.setItem('userId', user.id);
      await db.seedDemoData(user.id, user.name);
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  },

  loginWithGoogle: async (googleUser: { email: string; name: string; photo?: string }) => {
    try {
      const email = googleUser.email.trim().toLowerCase();
      if (!isGmail(email)) {
        return { success: false, error: 'Only Gmail addresses are allowed' };
      }

      let user = await db.getUserByEmail(email);
      if (!user) {
        user = await db.createUser({
          email,
          name: googleUser.name,
          defaultCurrency: 'USD',
          password: 'google-oauth-' + Date.now(),
        });
        await db.seedDemoData(user.id, user.name);
      }

      await storage.setItem('userId', user.id);
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
  },

  logout: async () => {
    await storage.removeItem('userId');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      const userId = await storage.getItem('userId');
      if (userId) {
        const user = await db.getUser(userId);
        if (user) {
          set({ user, isAuthenticated: true, isLoading: false });
          return;
        }
      }
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;
    await db.updateUser(user.id, updates);
    set({ user: { ...user, ...updates } });
  },
}));
