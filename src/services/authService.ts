import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Firebase Auth のセッション復元を待ってから匿名サインインする。
 * AsyncStorage からのセッション復元は非同期のため、
 * onAuthStateChanged の最初の発火（null or User）を待つ必要がある。
 */
export async function signInAnon(): Promise<string | null> {
  try {
    // Auth 状態が確定するまで待つ（最大 5 秒）
    // onAuthStateChanged は初回必ず発火する（null or 復元済みユーザー）
    if (!auth.currentUser) {
      await new Promise<void>((resolve) => {
        let unsub: (() => void) | null = null;
        const finish = () => {
          if (unsub) { unsub(); unsub = null; }
          clearTimeout(timeout);
          resolve();
        };
        const timeout = setTimeout(finish, 5000);
        unsub = onAuthStateChanged(auth, () => finish());
      });
    }

    if (auth.currentUser) return auth.currentUser.uid;

    // 復元されたセッションがなければ匿名サインイン
    const { user } = await signInAnonymously(auth);
    return user.uid;
  } catch (e) {
    if (__DEV__) console.warn('[Auth] signInAnon エラー:', e);
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
