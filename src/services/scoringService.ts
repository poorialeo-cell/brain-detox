import { SCORING_CONFIG, ActionDifficulty } from '../config/scoringConfig';

// ── ストリーク倍率 ────────────────────────────────────────────────────
export function getStreakMultiplier(streak: number): number {
  const s = SCORING_CONFIG.streak;
  if (streak >= 14) return s.days14;
  if (streak >= 7)  return s.days7;
  if (streak >= 3)  return s.days3;
  return s.days1;
}

// ── スコア帯別の倍率 ─────────────────────────────────────────────────
function getScoreBand(brainScore: number) {
  const { high, mid, low } = SCORING_CONFIG.scoreBand;
  if (brainScore >= high.threshold) return high;
  if (brainScore >= mid.threshold)  return mid;
  return low;
}

export function getScoreGainMultiplier(brainScore: number): number {
  return getScoreBand(brainScore).scoreMultiplier;
}

export function getDecayMultiplier(brainScore: number): number {
  return getScoreBand(brainScore).decayMultiplier;
}

// ── アクション完了時の加算計算 ────────────────────────────────────────
export interface ActionGainResult {
  scoreGain: number;
  xpGain:    number;
  rawScore:  number;  // 倍率前の基本値（デバッグ用）
}

export function calculateActionGain(
  difficulty: ActionDifficulty,
  streak: number,
  brainScore: number
): ActionGainResult {
  const base         = SCORING_CONFIG.difficulty[difficulty];
  const streakMul    = getStreakMultiplier(streak);
  const recoveryMul  = getScoreGainMultiplier(brainScore);

  return {
    scoreGain: Math.round(base.score * streakMul * recoveryMul),
    xpGain:    Math.round(base.xp    * streakMul),   // XPには回復倍率を乗せない
    rawScore:  base.score,
  };
}

// ── 自然減衰計算 ─────────────────────────────────────────────────────
export function calculateDecay(brainScore: number, daysSinceLastDecay: number): number {
  if (daysSinceLastDecay <= SCORING_CONFIG.decay.graceDays) return 0;

  const effectiveDays = daysSinceLastDecay - SCORING_CONFIG.decay.graceDays;
  const dailyDecay    = Math.min(
    SCORING_CONFIG.decay.basePerDay * getDecayMultiplier(brainScore),
    SCORING_CONFIG.decay.maxPerDay
  );
  return Math.round(dailyDecay * effectiveDays);
}

// ── ブレインロットテスト結果計算 ──────────────────────────────────────
export function calculateTestResult(answers: number[]): number {
  const { q1Scores, q2Scores, q3Scores, maxChange } = SCORING_CONFIG.test;
  const total = (q1Scores[answers[0]] ?? 0)
              + (q2Scores[answers[1]] ?? 0)
              + (q3Scores[answers[2]] ?? 0);
  return Math.max(-maxChange, Math.min(maxChange, total));
}

// ── XP → レベル変換 ──────────────────────────────────────────────────
export function getLevelFromXP(xp: number) {
  let current = SCORING_CONFIG.levels[0];
  for (const lvl of SCORING_CONFIG.levels) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  // 次のレベルまでの進捗
  const idx  = SCORING_CONFIG.levels.indexOf(current);
  const next = SCORING_CONFIG.levels[idx + 1] ?? null;
  const progress = next
    ? (xp - current.xpRequired) / (next.xpRequired - current.xpRequired)
    : 1;

  return { ...current, next, progress };
}

// ── 回復エフェクト強度 ────────────────────────────────────────────────
export type RecoveryEffectSize = 'small' | 'medium' | 'large';

export function getRecoveryEffectSize(xpGain: number): RecoveryEffectSize {
  const { small, medium } = SCORING_CONFIG.recoveryEffect;
  if (xpGain <= small)  return 'small';
  if (xpGain <= medium) return 'medium';
  return 'large';
}

// ── テスト通知が必要か判定 ────────────────────────────────────────────
export function isDueForTest(lastTestDate: string | null): boolean {
  if (!lastTestDate) return true;
  const last = new Date(lastTestDate);
  const now  = new Date();
  const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= SCORING_CONFIG.test.intervalDays;
}

// ── 経過日数計算 ─────────────────────────────────────────────────────
export function getDaysSince(dateString: string | null): number {
  if (!dateString) return 0;
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ── 今日の日付文字列（比較用）────────────────────────────────────────
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}
