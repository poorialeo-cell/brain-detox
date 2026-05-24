import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PartnerType, Language, ScoreEntry } from '../types';
import { normalizeTimestampMs } from '../utils/calendarFormat';

// ── ユーザープロフィール ──────────────────────────────────────────────

interface UserProfile {
  partner: PartnerType;
  brainScore: number;
  language: Language;
  updatedAt: any;
}

export async function saveUserProfile(
  userId: string,
  profile: Omit<UserProfile, 'updatedAt'>
): Promise<void> {
  await setDoc(
    doc(db, 'users', userId),
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ── スコア履歴 ───────────────────────────────────────────────────────

export async function saveScoreEntry(
  userId: string,
  entry: Omit<ScoreEntry, 'id'>
): Promise<void> {
  await addDoc(collection(db, 'users', userId, 'scoreHistory'), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

/**
 * リセット時にユーザーの Firestore データを削除する。
 * - users/{uid}/scoreHistory/* （サブコレクション）を全削除
 * - users/{uid} ドキュメントを削除
 * - rateLimits/{uid} ドキュメントは関数側で管理するため触らない
 *
 * Firestore のサブコレクションはクライアント SDK では自動削除されないため、
 * 個別に削除する必要がある。バッチで 500 件ずつ削除。
 */
export async function deleteUserData(userId: string): Promise<void> {
  if (!userId) return;
  const histCol = collection(db, 'users', userId, 'scoreHistory');

  // scoreHistory をバッチで削除（500件ずつ繰り返し）
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q = query(histCol, limit(500));
    const snap = await getDocs(q);
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < 500) break;
  }

  // 親ドキュメント削除
  await deleteDoc(doc(db, 'users', userId)).catch(() => {});
}

export async function loadScoreHistory(
  userId: string,
  maxEntries = 30
): Promise<ScoreEntry[]> {
  const q = query(
    collection(db, 'users', userId, 'scoreHistory'),
    orderBy('timestamp', 'desc'),
    limit(maxEntries)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const raw = d.data();
    return {
      id: d.id,
      score: raw.score as number,
      timestamp: normalizeTimestampMs(raw.timestamp),
      kind: (raw.kind as ScoreEntry['kind'] | undefined) ?? undefined,
      actionTitle: raw.actionTitle as string | undefined,
      xpGained: raw.xpGained as number | undefined,
      scoreGain: raw.scoreGain as number | undefined,
      testDelta: typeof raw.testDelta === 'number' ? raw.testDelta : undefined,
    };
  });
}
