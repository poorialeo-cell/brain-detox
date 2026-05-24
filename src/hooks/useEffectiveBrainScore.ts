import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getEffectiveBrainScore } from '../services/scoringService';

/**
 * テスト後の24hドリフトを反映した表示用ブレインスコア。
 * 経過時間に応じて定期的に再計算します。
 */
export function useEffectiveBrainScore(): number {
  const brainScore = useAppStore((s) => s.brainScore);
  const postTestCycle = useAppStore((s) => s.postTestCycle);
  const finalize = useAppStore((s) => s.finalizeExpiredPostTestCycleIfNeeded);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    finalize();
  }, [finalize, brainScore, postTestCycle, tick]);

  useEffect(() => {
    if (!postTestCycle) return;
    const id = setInterval(() => {
      finalize();
      setTick((x) => x + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [postTestCycle, finalize]);

  return useMemo(
    () => getEffectiveBrainScore({ brainScore, postTestCycle }, Date.now()),
    [brainScore, postTestCycle, tick],
  );
}
