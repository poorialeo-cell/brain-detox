/**
 * スコアリングの全調整値をここで一元管理します。
 * 数値を変えるだけでアプリ全体の挙動が変わります。
 */

export const SCORING_CONFIG = {

  // ── アクション難易度ごとの基本ポイント ──────────────────────────
  difficulty: {
    easy:   { score: 3,  xp: 6  },
    medium: { score: 6,  xp: 12 },
    hard:   { score: 10, xp: 20 },
  },

  // ── ストリーク倍率（連続日数に応じた加算倍率）────────────────
  streak: {
    days1:  1.0,   // 1〜2日
    days3:  1.2,   // 3〜6日
    days7:  1.5,   // 7〜13日
    days14: 2.0,   // 14日以上
  },

  // ── スコア帯ごとの倍率 ────────────────────────────────────────
  // scoreMultiplier: アクション加算への倍率
  // decayMultiplier: 自然減衰への倍率（高いほど下がりやすい）
  scoreBand: {
    high: { threshold: 70, scoreMultiplier: 0.8, decayMultiplier: 1.3 },
    mid:  { threshold: 40, scoreMultiplier: 1.0, decayMultiplier: 1.0 },
    low:  { threshold: 0,  scoreMultiplier: 1.5, decayMultiplier: 0.6 },
  },

  // ── 自然減衰設定 ─────────────────────────────────────────────
  decay: {
    basePerDay: 2.5,   // 1日あたりの基本減衰量
    maxPerDay:  5,     // 1日の最大減衰上限
    graceDays:  1,     // 何日間は減衰しないか（当日は減衰しない）
  },

  // ── ブレインロット状態テスト ──────────────────────────────────
  test: {
    intervalDays: 3,   // 何日ごとにテストを促すか
    maxChange: 10,     // 1回のテストで変動する最大スコア幅
    // 旧3問形式（参照用・calculateTestResult 互換）
    q1Scores: [3, 0, -3, -5],
    q2Scores: [3, 0, -3, -5],
    q3Scores: [4, 0, -3, -6],
    /** 2分 Vibe Check（ミニゲーム）＋ショート動画5択から delta を算出 */
    vibeCheck: {
      /** B_raw = W1*Accuracy + W2*(1/avgRT_sec 正規化) + Bonus 後 0–1 に丸め、delta に写像 */
      W1: 0.52,
      W2: 0.28,
      /** 1/AvgRT の正規化に使う秒（これより速い反応は満点扱い） */
      speedNormSeconds: 0.55,
      maxBonus: 0.2,
      /** ショート動画5択（視聴が少ないほど良い）→ delta 加算 */
      videoHoursScores: [4, 2, 0, -3, -5] as const,
    },
  },

  // ── XPレベル定義 ─────────────────────────────────────────────
  levels: [
    { level: 1,  nameKey: 'level.names.1',  xpRequired: 0    },
    { level: 2,  nameKey: 'level.names.2',  xpRequired: 50   },
    { level: 3,  nameKey: 'level.names.3',  xpRequired: 150  },
    { level: 4,  nameKey: 'level.names.4',  xpRequired: 300  },
    { level: 5,  nameKey: 'level.names.5',  xpRequired: 500  },
    { level: 6,  nameKey: 'level.names.6',  xpRequired: 750  },
    { level: 7,  nameKey: 'level.names.7',  xpRequired: 1100 },
    { level: 8,  nameKey: 'level.names.8',  xpRequired: 1500 },
    { level: 9,  nameKey: 'level.names.9',  xpRequired: 2000 },
    { level: 10, nameKey: 'level.names.10', xpRequired: 3000 },
  ],

  // ── 回復エフェクト強度の閾値（XP量で判定）────────────────────
  recoveryEffect: {
    small:  6,   // Easy完了
    medium: 12,  // Medium完了
    large:  18,  // Hard or ストリークボーナス時
  },
} as const;

export type ActionDifficulty = keyof typeof SCORING_CONFIG.difficulty;
