import { Badge } from '../types';
import { ActionDifficulty } from '../config/scoringConfig';

// ── バッジ定義（ここに追加するだけで新バッジが増える）────────────────
export const BADGE_DEFINITIONS: Omit<Badge, 'earnedAt'>[] = [
  { id: 'first_action',  nameKey: 'badges.first_action.name',  descriptionKey: 'badges.first_action.description',  emoji: '🌱', color: '#4ade80' },
  { id: 'streak_3',      nameKey: 'badges.streak_3.name',      descriptionKey: 'badges.streak_3.description',      emoji: '🔥', color: '#fb923c' },
  { id: 'streak_7',      nameKey: 'badges.streak_7.name',      descriptionKey: 'badges.streak_7.description',      emoji: '⚡', color: '#facc15' },
  { id: 'streak_14',     nameKey: 'badges.streak_14.name',     descriptionKey: 'badges.streak_14.description',     emoji: '🏆', color: '#a78bfa' },
  { id: 'streak_30',     nameKey: 'badges.streak_30.name',     descriptionKey: 'badges.streak_30.description',     emoji: '👑', color: '#fcd34d' },
  { id: 'xp_100',        nameKey: 'badges.xp_100.name',        descriptionKey: 'badges.xp_100.description',        emoji: '🌿', color: '#34d399' },
  { id: 'xp_500',        nameKey: 'badges.xp_500.name',        descriptionKey: 'badges.xp_500.description',        emoji: '💜', color: '#a78bfa' },
  { id: 'xp_1000',       nameKey: 'badges.xp_1000.name',       descriptionKey: 'badges.xp_1000.description',       emoji: '✨', color: '#fcd34d' },
  { id: 'recovery_3',    nameKey: 'badges.recovery_3.name',    descriptionKey: 'badges.recovery_3.description',    emoji: '💪', color: '#fb7185' },
  { id: 'level_5',       nameKey: 'badges.level_5.name',       descriptionKey: 'badges.level_5.description',       emoji: '🌸', color: '#f9a8d4' },
  { id: 'level_10',      nameKey: 'badges.level_10.name',      descriptionKey: 'badges.level_10.description',      emoji: '🧠', color: '#FFD700' },
  { id: 'hard_action',   nameKey: 'badges.hard_action.name',   descriptionKey: 'badges.hard_action.description',   emoji: '🎯', color: '#f87171' },
  { id: 'early_bird',    nameKey: 'badges.early_bird.name',    descriptionKey: 'badges.early_bird.description',    emoji: '🌅', color: '#fdba74' },
  { id: 'night_owl',     nameKey: 'badges.night_owl.name',     descriptionKey: 'badges.night_owl.description',     emoji: '🌙', color: '#818cf8' },
];

// 初期バッジリスト（全部未獲得で初期化）
export function initBadges(): Badge[] {
  return BADGE_DEFINITIONS.map((def) => ({ ...def, earnedAt: null }));
}

// ── バッジ獲得チェック ────────────────────────────────────────────────
interface CheckContext {
  totalXP: number;
  streak: number;
  currentLevel: number;
  actionCount: number;
  difficulty: ActionDifficulty;
  brainScoreBefore: number;   // アクション前のスコア（回復判定用）
  recoveryBoostCount: number;
}

export function checkNewBadges(
  existingBadges: Badge[],
  ctx: CheckContext
): Badge[] {
  const earnedIds = new Set(existingBadges.filter((b) => b.earnedAt).map((b) => b.id));
  const now = new Date();
  const hour = now.getHours();
  const newBadges: Badge[] = [];

  const award = (id: string, condition: boolean) => {
    if (!earnedIds.has(id) && condition) {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id);
      if (def) newBadges.push({ ...def, earnedAt: now.toISOString() });
    }
  };

  award('first_action',  ctx.actionCount >= 1);
  award('streak_3',      ctx.streak >= 3);
  award('streak_7',      ctx.streak >= 7);
  award('streak_14',     ctx.streak >= 14);
  award('streak_30',     ctx.streak >= 30);
  award('xp_100',        ctx.totalXP >= 100);
  award('xp_500',        ctx.totalXP >= 500);
  award('xp_1000',       ctx.totalXP >= 1000);
  award('recovery_3',    ctx.recoveryBoostCount >= 3);
  award('level_5',       ctx.currentLevel >= 5);
  award('level_10',      ctx.currentLevel >= 10);
  award('hard_action',   ctx.difficulty === 'hard');
  award('early_bird',    hour < 8);
  award('night_owl',     hour >= 23);

  return newBadges;
}

// ── 寛容なストリーク判定 ──────────────────────────────────────────────
// 「昨日忘れても今日の午前中なら継続扱い」
export function calcNewStreak(
  currentStreak: number,
  lastActionDate: string | null
): number {
  if (!lastActionDate) return 1;

  const today = new Date();
  const last  = new Date(lastActionDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((today.setHours(0,0,0,0) - last.setHours(0,0,0,0)) / msPerDay);

  if (daysDiff === 0) return currentStreak;          // 今日すでに実施済み
  if (daysDiff === 1) return currentStreak + 1;      // 昨日実施→通常継続
  if (daysDiff === 2 && new Date().getHours() < 12) {
    return currentStreak + 1;                        // 昨日忘れたが午前中の猶予
  }
  return 1;                                          // リセット
}
