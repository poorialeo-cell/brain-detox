import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// 二重初期化防止
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth: AsyncStorage でセッションをアプリ再起動後も維持する
// getReactNativePersistence は RN ビルドのみに存在するため require で取得
// Fast Refresh で initializeAuth が二重に呼ばれた場合は getAuth(app) にフォールバック
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (s: typeof AsyncStorage) => import('firebase/auth').Persistence;
};

function createAuth() {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh 等で既に初期化済みの場合は既存インスタンスを返す
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);
export default app;
