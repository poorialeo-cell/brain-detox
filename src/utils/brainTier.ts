/**
 * スコア帯（1–10, 11–20, … 91–100）に対応するティア 1〜10。
 * アセット名: assets/brain_tier_01.png … brain_tier_10.png
 */
export function getBrainTier(score: number): number {
  const s = Math.max(0, Math.min(100, score));
  if (s === 0) return 1;
  return Math.min(10, Math.ceil(s / 10));
}
