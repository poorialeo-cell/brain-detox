import type { Language, ScoreEntry } from '../types';
import { localDayKey, isBrainRotTestEntry } from './calendarFormat';

/** ローカル暦での1日あたりのテスト回数上限 */
export const BRAIN_ROT_TEST_MAX_PER_LOCAL_DAY = 2;

/** 直近のテスト完了から次回までに空ける時間（ms） */
export const BRAIN_ROT_TEST_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type BrainRotTestBlockReason = 'dailyLimit' | 'cooldown';

export type BrainRotTestEligibility =
  | { ok: true }
  | { ok: false; reason: BrainRotTestBlockReason; nextAllowedAt?: number };

/** スコア履歴に基づき、テストを新規に完了記録できるか */
export function getBrainRotTestEligibility(
  scoreHistory: ScoreEntry[],
  nowMs: number = Date.now(),
): BrainRotTestEligibility {
  const tests = scoreHistory.filter(isBrainRotTestEntry);
  const todayKey = localDayKey(nowMs);
  const testsToday = tests.filter((e) => localDayKey(e.timestamp) === todayKey).length;
  if (testsToday >= BRAIN_ROT_TEST_MAX_PER_LOCAL_DAY) {
    return { ok: false, reason: 'dailyLimit' };
  }

  const lastTs = tests.reduce((m, e) => Math.max(m, e.timestamp), 0);
  if (lastTs > 0 && nowMs - lastTs < BRAIN_ROT_TEST_COOLDOWN_MS) {
    return {
      ok: false,
      reason: 'cooldown',
      nextAllowedAt: lastTs + BRAIN_ROT_TEST_COOLDOWN_MS,
    };
  }

  return { ok: true };
}

const LOCALE: Record<Language, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  th: 'th-TH',
};

/** クールダウン解除目安の日時（ローカル表示） */
export function formatNextAllowedClock(ts: number, language: Language): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[language], {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
