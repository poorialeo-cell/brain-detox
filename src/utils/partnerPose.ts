import { PartnerPose } from '../types';

/** ホーム画面アバター: 高スコアは triumph、低スコアは gentle、それ以外は idle */
export function getHomePartnerPose(brainScore: number): PartnerPose {
  if (brainScore > 80) return 'triumph';
  if (brainScore < 35) return 'gentle';
  return 'idle';
}
