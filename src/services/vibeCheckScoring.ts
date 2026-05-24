import { SCORING_CONFIG } from '../config/scoringConfig';

/** 2分 Vibe Check 各フェーズの生データ → `calculateVibeCheckDelta` へ渡す */
export interface VibeCheckMetrics {
  colorSwerve: {
    correct: number;
    total: number;
    responseTimesMs: number[];
    maxCombo: number;
  };
  synapse: {
    roundsAttempted: number;
    roundsCorrect: number;
    maxSequenceLength: number;
    responseTimesMs: number[];
  };
  focus: {
    focusedMs: number;
    totalMs: number;
    distractorHits: number;
  };
  /** ショート動画 5択（0 = 最も少ない … 4 = 最も多い） */
  videoHoursIndex: number;
}

/**
 * Vibe Check のミニゲーム結果から、テストで brainScore に加算する delta（±maxChange）を求める。
 *
 * 内部素点（0〜1 付近）:
 *   linear = W1·Accuracy + W2·speedNorm + Bonus
 *   • Accuracy … Color / Synapse / Focus の加重平均正解率（妨害タップで Focus を減衰）
 *   • speedNorm … 全試行の平均反応時間 RT（秒）から 1/RT を speedNormSeconds で正規化
 *   • Bonus … コンボ・記憶到達長・妨害ゼロの微小ボーナス（maxBonus で頭打ち）
 *
 *   deltaGame = (clamp01(linear) - 0.5) × 2 × maxChange
 *   delta = clamp( deltaGame + 0.42 × videoHoursScores[index], ±maxChange )
 */
export function calculateVibeCheckDelta(metrics: VibeCheckMetrics): number {
  const { maxChange, vibeCheck: vc } = SCORING_CONFIG.test;

  const accColor =
    metrics.colorSwerve.total > 0
      ? metrics.colorSwerve.correct / metrics.colorSwerve.total
      : 0.45;
  const accSyn =
    metrics.synapse.roundsAttempted > 0
      ? metrics.synapse.roundsCorrect / metrics.synapse.roundsAttempted
      : 0.45;
  const focusRatio =
    metrics.focus.totalMs > 0 ? Math.min(1, metrics.focus.focusedMs / metrics.focus.totalMs) : 0.45;
  const hitPenalty = Math.min(0.35, metrics.focus.distractorHits * 0.09);
  const accFocus = Math.max(0, focusRatio - hitPenalty);

  const Accuracy = (2 * accColor + 2 * accSyn + accFocus) / 5;

  const rts = [...metrics.colorSwerve.responseTimesMs, ...metrics.synapse.responseTimesMs].filter(
    (x) => Number.isFinite(x) && x > 0,
  );
  const avgRtSec =
    rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length / 1000 : 1.35;
  const invRt = 1 / Math.max(0.22, avgRtSec);
  const invCap = 1 / Math.max(0.22, vc.speedNormSeconds);
  const speedNorm = Math.min(1, invRt / invCap);

  const comboPart = Math.min(vc.maxBonus * 0.45, metrics.colorSwerve.maxCombo * 0.014);
  const memoryPart = Math.min(
    vc.maxBonus * 0.5,
    Math.max(0, metrics.synapse.maxSequenceLength - 3) * 0.026,
  );
  const cleanFocus =
    metrics.focus.distractorHits === 0 && metrics.focus.totalMs > 3000 ? vc.maxBonus * 0.08 : 0;
  let Bonus = Math.min(vc.maxBonus, comboPart + memoryPart + cleanFocus);

  const linear = vc.W1 * Accuracy + vc.W2 * speedNorm + Bonus;
  const raw01 = Math.max(0, Math.min(1, linear));

  const deltaGame = (raw01 - 0.5) * 2 * maxChange;

  const vi = Math.min(4, Math.max(0, Math.floor(metrics.videoHoursIndex)));
  const videoAdj = vc.videoHoursScores[vi] ?? 0;
  const delta = deltaGame + videoAdj * 0.42;

  return Math.max(-maxChange, Math.min(maxChange, Math.round(delta)));
}
