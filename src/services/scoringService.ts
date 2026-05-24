import { SCORING_CONFIG, ActionDifficulty } from '../config/scoringConfig';
import type { PostTestCycleState } from '../types';

export type { VibeCheckMetrics } from './vibeCheckScoring';
export { calculateVibeCheckDelta } from './vibeCheckScoring';

/** テスト後・未アクション時のスコアが B → (A+B)/2 へ寄る時間（時間） */
export const POST_TEST_DRIFT_HOURS = 24;

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

/** 脳への影響度 × 実施時間（目安比）で加算。係数は後から調整前提のプレースホルダ */
export function calculateDurationImpactGain(params: {
  brainImpact: number;
  plannedSeconds: number;
  actualSeconds: number;
  difficulty: ActionDifficulty;
  streak: number;
  brainScore: number;
}): ActionGainResult {
  const impact = Math.min(5, Math.max(1, Math.round(params.brainImpact)));
  const planned = Math.max(30, params.plannedSeconds);
  const actual = Math.max(15, params.actualSeconds);
  const ratio = actual / planned;
  const durationFactor = Math.min(1.55, Math.max(0.5, Math.sqrt(ratio)));
  const impactFactor = 0.52 + impact * 0.1;

  const base = SCORING_CONFIG.difficulty[params.difficulty];
  const rawScore = base.score * impactFactor * durationFactor;
  const streakMul = getStreakMultiplier(params.streak);
  const recoveryMul = getScoreGainMultiplier(params.brainScore);
  const scoreGain = Math.round(rawScore * streakMul * recoveryMul);

  const rawXp = base.xp * (0.72 + impact * 0.055) * Math.min(1.45, durationFactor);
  const xpGain = Math.round(rawXp * streakMul);

  return { scoreGain, xpGain, rawScore };
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

/**
 * Step2-A: アクション未実行時、B から (A+B)/2 へ 24h で線形に変化したスコア（未クランプの生値）
 * t = 経過時間（時間）
 */
export function computePostTestDriftRawScore(
  baseA: number,
  provisionalB: number,
  cycleStartedAt: number,
  nowMs: number = Date.now(),
): number {
  const t = (nowMs - cycleStartedAt) / (1000 * 60 * 60);
  if (t >= POST_TEST_DRIFT_HOURS) {
    return (baseA + provisionalB) / 2;
  }
  const target = (baseA + provisionalB) / 2;
  return provisionalB + (target - provisionalB) * (t / POST_TEST_DRIFT_HOURS);
}

/** 画面表示用: 0〜100 に丸めたドリフトスコア */
export function getEffectiveBrainScore(
  snapshot: { brainScore: number; postTestCycle: PostTestCycleState | null },
  nowMs: number = Date.now(),
): number {
  const c = snapshot.postTestCycle;
  if (!c) return snapshot.brainScore;
  const raw = computePostTestDriftRawScore(c.baseA, c.provisionalB, c.cycleStartedAt, nowMs);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Step2-B: 達成度 r に応じた確定スコア C
 * r=0 → (A+B)/2、r=1 → A + (100-A)/2
 */
export function computeConfirmedScoreAfterAction(baseA: number, provisionalB: number, r: number): number {
  const clampedR = Math.min(1, Math.max(0, r));
  const low = (baseA + provisionalB) / 2;
  const high = baseA + (100 - baseA) / 2;
  return low + clampedR * (high - low);
}

/** アクションプラン全体の達成度 r（0〜1）＝ 実際にかかった合計秒 / 目安合計秒 */
export function computePlanAchievementRatio(totalNominalSeconds: number, totalActualSeconds: number): number {
  const n = Math.max(60, totalNominalSeconds);
  const a = Math.max(0, totalActualSeconds);
  return Math.min(1, a / n);
}

// ── XP → レベル変換 ──────────────────────────────────────────────────
export function getLevelFromXP(xp: number) {
  type LevelRow = (typeof SCORING_CONFIG.levels)[number];
  let current: LevelRow = SCORING_CONFIG.levels[0];
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
