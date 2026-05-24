import { ACTION_BASES, ActionBaseDefinition } from '../data/actionBases';
import { buildOfflineActionFromBaseSafe } from './buildOfflineAction';
import { PartnerType, Language, ActionSuggestion } from '../types';
import { getNominalDurationSeconds } from '../utils/actionDuration';

/** アクションプランの合計目安（秒）— 約30分 */
export const PLAN_TARGET_SECONDS = 30 * 60;
const PLAN_MIN_TOTAL = 26 * 60;
const PLAN_MAX_TOTAL = 34 * 60;

function scoreBaseForPlan(base: ActionBaseDefinition, baseA: number, provisionalB: number): number {
  const drop = Math.max(0, baseA - provisionalB);
  const lowB = provisionalB < 45;
  return base.brainImpact * (1 + drop / 28) + (lowB ? 1.6 : 0) + Math.random() * 0.12;
}

/** A・B に応じてカタログから baseId を選び、合計がおよそ30分になるよう組み合わせる */
export function selectPlanBaseIds(baseA: number, provisionalB: number): string[] {
  const ranked = [...ACTION_BASES].sort(
    (a, b) => scoreBaseForPlan(b, baseA, provisionalB) - scoreBaseForPlan(a, baseA, provisionalB),
  );

  const picked: string[] = [];
  let sum = 0;

  for (const b of ranked) {
    if (picked.includes(b.id)) continue;
    if (sum >= PLAN_TARGET_SECONDS) break;
    if (sum + b.nominalSeconds > PLAN_MAX_TOTAL && picked.length >= 4) continue;
    picked.push(b.id);
    sum += b.nominalSeconds;
    if (sum >= PLAN_MIN_TOTAL && sum >= PLAN_TARGET_SECONDS - 120) break;
  }

  let guard = 0;
  while (sum < PLAN_MIN_TOTAL && guard < 24) {
    const next = ranked.find((b) => !picked.includes(b.id));
    if (!next) break;
    picked.push(next.id);
    sum += next.nominalSeconds;
    guard++;
  }

  if (picked.length === 0) picked.push('water_break');
  return picked;
}

export function buildOfflineActionPlanSteps(
  baseA: number,
  provisionalB: number,
  partner: PartnerType,
  language: Language,
): ActionSuggestion[] {
  const ids = selectPlanBaseIds(baseA, provisionalB);
  return ids.map((id) => buildOfflineActionFromBaseSafe(id, partner, language));
}

export function sumPlanNominalSeconds(steps: ActionSuggestion[]): number {
  return steps.reduce((s, a) => s + getNominalDurationSeconds(a), 0);
}
