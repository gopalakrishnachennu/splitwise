import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Single, correct Firebase config (from your web app settings)
const firebaseConfig = {
  apiKey: 'AIzaSyChPse3kjxE9ROvUdRd70KhT8DVhptkapM',
  authDomain: 'splitx-27952.firebaseapp.com',
  databaseURL: 'https://splitx-27952-default-rtdb.firebaseio.com',
  projectId: 'splitx-27952',
  storageBucket: 'splitx-27952.firebasestorage.app',
  messagingSenderId: '324385810709',
  appId: '1:324385810790:web:12c522e2cb3017794fe11c',
  measurementId: 'G-XJMCRTWWY8',
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth (platform-correct)
// - Native (iOS/Android): React Native persistence via AsyncStorage
// - Web: browser persistence
let auth: ReturnType<typeof initializeAuth> | ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
  // Ensure session persists on refresh
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Auth already initialized (e.g. hot reload)
    auth = getAuth(app);
  }
}

// Initialize Firestore
// Note: IndexedDB persistence is web-only; avoid it on native JS runtime.
let db: ReturnType<typeof initializeFirestore> | ReturnType<typeof getFirestore>;
if (Platform.OS === 'web') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true }),
      }),
    });
  } catch {
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
