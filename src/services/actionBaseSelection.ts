import { getAllActionBaseIds } from '../data/actionBases';

const RECENT_LEN = 12;

export interface PickBaseParams {
  recentBaseIds: string[];
  baseAffinityBonus: Record<string, number>;
}

/** 直近に出たベースを抑え、未登場にウェイトを寄せる。よいリアクション bonuses は少しだけ打ち消す */
export function pickNextBaseId(params: PickBaseParams): string {
  const ids = getAllActionBaseIds();
  const weights = ids.map((id) => {
    let w = 1;
    params.recentBaseIds.forEach((rid, idx) => {
      if (rid !== id) return;
      // 直近ほど強く同じベースを避ける
      const positionFactor = 1 / (idx + 1);
      w *= 0.28 + 0.22 * positionFactor;
    });
    const bonus = Math.min(0.35, params.baseAffinityBonus[id] ?? 0);
    w *= 1 + bonus;
    return Math.max(0.08, w);
  });

  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

export function pushRecentBaseId(recent: string[], baseId: string): string[] {
  return [baseId, ...recent.filter((id) => id !== baseId)].slice(0, RECENT_LEN);
}

export function applyGoodReactionAffinity(
  affinity: Record<string, number>,
  baseId: string,
): Record<string, number> {
  const prev = affinity[baseId] ?? 0;
  const next = Math.min(0.28, prev + 0.07);
  return { ...affinity, [baseId]: next };
}
