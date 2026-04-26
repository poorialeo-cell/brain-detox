import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

// 匿名サインイン（アカウント不要でユーザーIDを発行）
export async function signInAnon(): Promise<string | null> {
  try {
    const { user } = await signInAnonymously(auth);
    return user.uid;
  } catch (e) {
    console.warn('Auth error:', e);
    return null;
  }
}

// 現在のユーザーを取得
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// 認証状態の変化を監視
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
