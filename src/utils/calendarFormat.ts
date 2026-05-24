import type { Language, ScoreEntry } from '../types';

export const DAY_MS = 86_400_000;

const LOCALE: Record<Language, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  th: 'th-TH',
};

/** Firestore・永続化データの timestamp をローカル用の epoch ms に正規化 */
export function normalizeTimestampMs(raw: unknown): number {
  if (raw == null) return Date.now();
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return normalizeTimestampMs(n);
    return Date.now();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 0 && raw < 1e12) return Math.round(raw * 1000);
    return raw;
  }
  if (typeof raw === 'object' && raw !== null && typeof (raw as { toMillis?: () => number }).toMillis === 'function') {
    return (raw as { toMillis: () => number }).toMillis();
  }
  if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
    const s = (raw as { seconds: number }).seconds;
    if (typeof s === 'number' && Number.isFinite(s)) return Math.round(s * 1000);
  }
  return Date.now();
}

/** ローカル日のキー YYYY-MM-DD（集計・カレンダーで共通） */
export function localDayKey(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isBrainRotTestEntry(e: ScoreEntry): boolean {
  return e.kind === 'brainRotTest';
}

/** Firestore 等のレガシー行（kind なし・タイトルあり）をアクションとみなす */
export function isActionHistoryEntry(e: ScoreEntry): boolean {
  return !isBrainRotTestEntry(e);
}

export function formatLocalDayLongFromKey(dayKey: string, language: Language): string {
  const parts = dayKey.split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d || parts.length !== 3) return dayKey;
  try {
    return new Intl.DateTimeFormat(LOCALE[language], { dateStyle: 'long' }).format(new Date(y, m - 1, d));
  } catch {
    return `${y}/${m}/${d}`;
  }
}

/** ローカル日付の 0:00（setHours 依存を避け calendar 成分のみで算出） */
export function startOfLocalDayMs(ts: number): number {
  const x = new Date(ts);
  if (Number.isNaN(x.getTime())) return ts;
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
}

/** 端末ローカル暦の M/D（スコア履歴・グラフ軸の統一） */
export function formatLocalCalendarMd(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** グラフの週軸用・短い曜日名 */
export function formatWeekdayShort(ts: number, language: Language): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[language], { weekday: 'short' }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    const dow = d.getDay();
    const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return en[dow] ?? '';
  }
}
