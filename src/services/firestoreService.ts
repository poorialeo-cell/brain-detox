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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PartnerType, Language, ScoreEntry } from '../types';

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
  return snap.docs.map((d) => ({
    id: d.id,
    score: d.data().score as number,
    timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
    actionTitle: d.data().actionTitle as string | undefined,
  }));
}
