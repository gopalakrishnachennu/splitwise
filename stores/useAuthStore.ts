import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  deleteUser as firebaseDeleteUser,
} from 'firebase/auth';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { auth } from '@/services/firebase';
import { User } from '@/types';
import * as db from '@/services/database';
import { processPendingOperations } from '@/services/offlineQueue';

/** True when app should block main UI until user verifies (email/password and !emailVerified). */
function needsEmailVerificationValue(fbUser: any): boolean {
  const hasPassword = !!fbUser?.providerData?.some((p: any) => p.providerId === 'password');
  return hasPassword && !fbUser?.emailVerified;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Only set for email/password users after load/login/signup; refreshed on reload */
  emailVerified: boolean;
  /** True when user must verify email before using app (email/password sign-in, not yet verified). */
  needsEmailVerification: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleUser?: { email: string; name: string; photo?: string; idToken?: string; accessToken?: string }) => Promise<{ success: boolean; error?: string }>;
  loginWithApple: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  /** Send verification email for current user (email/password). */
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  /** Refresh emailVerified from Firebase (e.g. after user clicks link). */
  refreshEmailVerified: () => Promise<void>;
  /** Re-auth required. Only for email/password provider. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  /** Re-auth required. Deletes Firebase user and Firestore profile. */
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const OWNER_ADMIN_EMAILS = [
  'gopalakrishnachennu@gmail.com',
  'gopalakrishnachennu.dev@gmail.com',
];

const firebaseUserToAppUser = async (firebaseUser: any): Promise<User> => {
  // The source of truth is Firestore `users/{uid}`.
  const { doc, getDoc, setDoc } = await import('firebase/firestore');
  const { db: firestoreDb } = await import('@/services/firebase');

  const id = firebaseUser.uid as string;
  const ref = doc(firestoreDb, 'users', id);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as any;
    const rawRole = (data.role ?? 'user') as string;
    let normRole: 'admin' | 'user' = typeof rawRole === 'string' && rawRole.toLowerCase() === 'admin' ? 'admin' : 'user';
    const emailFromDoc = (data.email ?? firebaseUser.email ?? '').toLowerCase();
    if (normRole === 'user' && OWNER_ADMIN_EMAILS.includes(emailFromDoc)) {
      normRole = 'admin';
    }
    return {
      id,
      email: data.email ?? firebaseUser.email ?? '',
      name: data.name ?? firebaseUser.displayName ?? 'User',
      phone: data.phone ?? undefined,
      avatarUrl: data.avatarUrl ?? firebaseUser.photoURL ?? undefined,
      defaultCurrency: data.defaultCurrency ?? 'USD',
      createdAt: data.createdAt ?? new Date().toISOString(),
      role: normRole,
    };
  }

  // If not in Firestore yet, create it with default role. Store email lowercase for consistent lookup.
  const createdAt = new Date().toISOString();
  const userDoc = {
    email: (firebaseUser.email ?? '').toLowerCase(),
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    phone: null,
    avatarUrl: firebaseUser.photoURL || null,
    defaultCurrency: 'USD',
    createdAt,
    role: 'user',
  };

  await setDoc(ref, userDoc);

  return {
    id,
    email: userDoc.email,
    name: userDoc.name,
    phone: undefined,
    avatarUrl: userDoc.avatarUrl || undefined,
    defaultCurrency: 'USD',
    createdAt,
    role: 'user',
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  emailVerified: true,
  needsEmailVerification: false,

  login: async (email: string, password: string) => {
    try {
      if (!email.trim()) return { success: false, error: 'Please enter your email' };
      if (!isValidEmail(email.trim())) return { success: false, error: 'Please enter a valid email address' };
      if (!password) return { success: false, error: 'Please enter your password' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = credential.user;
      await fbUser.reload();
      const user = await firebaseUserToAppUser(fbUser);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        emailVerified: fbUser.emailVerified,
        needsEmailVerification: needsEmailVerificationValue(fbUser),
      });
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      const code = error?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        return { success: false, error: 'No account found with this email. Please sign up first.' };
      }
      if (code === 'auth/wrong-password') {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many failed attempts. Please try again later.' };
      }
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  },

  signup: async (name: string, email: string, password: string, phone?: string) => {
    try {
      if (!name.trim()) return { success: false, error: 'Please enter your name' };
      if (name.trim().length < 2) return { success: false, error: 'Name must be at least 2 characters' };
      if (!email.trim()) return { success: false, error: 'Please enter your email' };
      if (!isValidEmail(email.trim())) return { success: false, error: 'Please enter a valid email address' };
      if (!password) return { success: false, error: 'Please enter a password' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = credential.user;

      // Update Firebase Auth profile
      await updateProfile(fbUser, { displayName: name.trim() });

      // Send verification email (no await so signup completes quickly)
      sendEmailVerification(fbUser).catch(() => {});

      // Create user doc in Firestore with Firebase UID
      const { setDoc, doc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('@/services/firebase');
      const id = credential.user.uid;
      const createdAt = new Date().toISOString();

      const emailLower = email.trim().toLowerCase();
      await setDoc(doc(firestoreDb, 'users', id), {
        email: emailLower,
        name: name.trim(),
        phone: phone?.trim() || null,
        avatarUrl: null,
        defaultCurrency: 'USD',
        createdAt,
        role: 'user',
      });

      const user: User = {
        id,
        email: emailLower,
        name: name.trim(),
        phone: phone?.trim(),
        defaultCurrency: 'USD',
    createdAt,
    role: 'user',
      };

      // Seed demo data
      await db.seedDemoData(user.id, user.name);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        emailVerified: fbUser.emailVerified,
        needsEmailVerification: needsEmailVerificationValue(fbUser),
      });
      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      const code = error?.code;
      if (code === 'auth/email-already-in-use') {
        return { success: false, error: 'This email is already registered. Please log in instead.' };
      }
      if (code === 'auth/weak-password') {
        return { success: false, error: 'Password is too weak. Please use at least 6 characters.' };
      }
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  },

  loginWithGoogle: async (googleUser?: { email: string; name: string; photo?: string; idToken?: string; accessToken?: string }) => {
    try {
      if (Platform.OS === 'web') {
        // Web: use Firebase popup
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        const result = await signInWithPopup(auth, provider);
        const user = await firebaseUserToAppUser(result.user);
        const verified = result.user.emailVerified;

        // seed demo data for new users
        const groups = await db.getGroups();
        if (groups.length === 0) {
          await db.seedDemoData(user.id, user.name);
        }

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          emailVerified: verified,
          needsEmailVerification: false,
        });
        return { success: true };
      } else {
        // Native: use token from expo-auth-session
        if (!googleUser) {
          return { success: false, error: 'Google sign-in data not provided' };
        }

        let firebaseUser;

        if (googleUser.idToken || googleUser.accessToken) {
          // Use Firebase credential with Google token
          const credential = GoogleAuthProvider.credential(
            googleUser.idToken || null,
            googleUser.accessToken || null
          );
          const result = await signInWithCredential(auth, credential);
          firebaseUser = result.user;
        } else {
          return { success: false, error: 'No Google authentication token received.' };
        }

        const user = await firebaseUserToAppUser(firebaseUser);
        const verified = firebaseUser.emailVerified;

        // seed demo data for new users
        const groups = await db.getGroups();
        if (groups.length === 0) {
          await db.seedDemoData(user.id, user.name);
        }

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          emailVerified: verified,
          needsEmailVerification: false,
        });
        return { success: true };
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google sign-in was cancelled.' };
      }
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        return { success: false, error: 'Firestore permissions error. Please update your Firestore security rules to allow authenticated reads/writes.' };
      }
      return { success: false, error: error?.message || 'Google sign-in failed. Please try again.' };
    }
  },

  loginWithApple: async () => {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Apple Sign-In is only available on iOS.' };
    }
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const Crypto = await import('expo-crypto');
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Apple Sign-In is not available on this device.' };
      }
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      const result = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
        requestedNonce: hashedNonce,
      });
      if (!result.identityToken) {
        return { success: false, error: 'No identity token from Apple.' };
      }
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: result.identityToken,
        rawNonce,
      });
      const userCred = await signInWithCredential(auth, credential);
      const user = await firebaseUserToAppUser(userCred.user);
      const groups = await db.getGroups();
      if (groups.length === 0) {
        await db.seedDemoData(user.id, user.name);
      }
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        emailVerified: userCred.user.emailVerified,
        needsEmailVerification: false,
      });
      return { success: true };
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Apple Sign-In was cancelled.' };
      }
      console.error('Apple login error:', error);
      return { success: false, error: error?.message || 'Apple Sign-In failed.' };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, needsEmailVerification: false });
    }
  },

  loadUser: async () => {
    try {
      // Set up auth state listener
      return new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              await firebaseUser.reload();
              const user = await firebaseUserToAppUser(firebaseUser);
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                emailVerified: firebaseUser.emailVerified,
                needsEmailVerification: needsEmailVerificationValue(firebaseUser),
              });
              // Best-effort generation of due recurring expenses for this user on app startup.
              db.generateRecurringExpensesForUser(user.id).catch(() => {});
              // Replay any pending offline operations (expenses/settlements) for this user.
              processPendingOperations(user.id).catch(() => {});
            } catch (err) {
              console.error('Error loading user data:', err);
              set({ isLoading: false });
            }
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false, emailVerified: true, needsEmailVerification: false });
          }
          unsubscribe();
          resolve();
        });
      });
    } catch {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;
    // Update Firestore profile
    const { setDoc, doc } = await import('firebase/firestore');
    const { db: firestoreDb } = await import('@/services/firebase');
    await setDoc(doc(firestoreDb, 'users', user.id), updates, { merge: true });

    // Also update Firebase Auth profile if name changed
    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.name });
    }

    set({ user: { ...user, ...updates } });
  },

  resetPassword: async (email: string) => {
    try {
      if (!email.trim()) return { success: false, error: 'Please enter your email' };
      if (!isValidEmail(email.trim())) return { success: false, error: 'Please enter a valid email' };
      // Web: same-origin /reset-password (add domain to Firebase Authorized domains)
      // Native: Firebase requires an https URL in authorized domains, so we send users
      // to a hosted \"reset complete\" landing page that can redirect them back to the app.
      const authDomain = 'splitx-27952.firebaseapp.com';
      const continueUrl =
        Platform.OS === 'web'
          ? `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
          : `https://${authDomain}/reset-complete/index.html`;
      const actionCodeSettings: any = {
        url: continueUrl,
        handleCodeInApp: true,
      };
      if (Platform.OS !== 'web') {
        const bundleId = Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.gopalakrishna.splitwise';
        const packageName = Constants.expoConfig?.android?.package ?? 'com.splitwise.app';
        actionCodeSettings.iOS = { bundleId };
        actionCodeSettings.android = { packageName };
      }
      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      return { success: true };
    } catch (error: any) {
      console.error('Reset password error:', error);
      const code = error?.code as string | undefined;
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Invalid email address.' };
      }
      if (code === 'auth/user-not-found') {
        return { success: false, error: 'No account found with this email.' };
      }
      if (code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error:
            'Email/Password sign-in is disabled in Firebase. Enable it in Firebase Console → Authentication → Sign-in method.',
        };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many requests. Please try again later.' };
      }
      if (typeof error?.message === 'string' && error.message) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
  },

  sendVerificationEmail: async () => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email) return { success: false, error: 'No signed-in user.' };
      await sendEmailVerification(fbUser);
      return { success: true };
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many attempts. Try again later.' };
      }
      return { success: false, error: error?.message || 'Failed to send verification email.' };
    }
  },

  refreshEmailVerified: async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fbUser.reload();
      set({
        emailVerified: fbUser.emailVerified,
        needsEmailVerification: needsEmailVerificationValue(fbUser),
      });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser?.email) return { success: false, error: 'Not signed in.' };
      if (newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters.' };
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);
      return { success: true };
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { success: false, error: 'Current password is incorrect.' };
      }
      if (code === 'auth/weak-password') {
        return { success: false, error: 'New password is too weak.' };
      }
      return { success: false, error: error?.message || 'Failed to change password.' };
    }
  },

  deleteAccount: async (password: string) => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser?.email) return { success: false, error: 'Not signed in.' };
      const credential = EmailAuthProvider.credential(fbUser.email, password);
      await reauthenticateWithCredential(fbUser, credential);
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db: firestoreDb } = await import('@/services/firebase');
      await deleteDoc(doc(firestoreDb, 'users', fbUser.uid));
      await firebaseDeleteUser(fbUser);
      set({ user: null, isAuthenticated: false, isLoading: false, emailVerified: true });
      return { success: true };
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { success: false, error: 'Password is incorrect.' };
      }
      return { success: false, error: error?.message || 'Failed to delete account.' };
    }
  },
}));
