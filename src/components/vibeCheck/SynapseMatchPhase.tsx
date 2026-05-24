import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useHaptics } from '../../hooks/useHaptics';

const POOL_LIST = ['🛞', '🧪', '🐶', '⚡', '🎮', '🧠'];
const BEAT_MS = 420;

function shuffleCopy<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type SynapseStats = {
  roundsAttempted: number;
  roundsCorrect: number;
  maxSequenceLength: number;
  responseTimesMs: number[];
};

type Props = {
  durationMs: number;
  onDone: (stats: SynapseStats) => void;
};

/**
 * シーケンス記憶：正解ごとに長さ+1、ミスで長さ3にリセット
 */
export default function SynapseMatchPhase({ durationMs, onDone }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const hapticsRef = useRef(haptics);
  const endAt = useRef(Date.now() + durationMs).current;
  const finished = useRef(false);

  const [remainMs, setRemainMs] = useState(durationMs);
  const [mode, setMode] = useState<'show' | 'recall'>('show');
  const [seqLen, setSeqLen] = useState(3);
  const [flashIdx, setFlashIdx] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [gridOrder, setGridOrder] = useState<string[]>(() => shuffleCopy(POOL_LIST));
  const [pulse, setPulse] = useState({ emoji: POOL_LIST[0] ?? '🧠', visible: false });

  const expected = useRef(0);
  const stats = useRef({
    roundsAttempted: 0,
    roundsCorrect: 0,
    maxSequenceLength: 3,
    responseTimesMs: [] as number[],
  });
  const recallStart = useRef(0);

  const beatScale = useRef(new Animated.Value(1)).current;

  const buildSequence = useCallback((len: number) => {
    const picks: string[] = [];
    const ix = shuffleCopy([0, 1, 2, 3, 4, 5]);
    for (let i = 0; i < len; i++) picks.push(POOL_LIST[ix[i]!]!);
    return picks;
  }, []);

  const startRound = useCallback(
    (len: number) => {
      const seq = buildSequence(len);
      setSequence(seq);
      expected.current = 0;
      setMode('show');
      setFlashIdx(0);
      setGridOrder(shuffleCopy(POOL_LIST));
    },
    [buildSequence],
  );

  useEffect(() => {
    startRound(3);
  }, [startRound]);

  useEffect(() => {
    hapticsRef.current = haptics;
  });

  useEffect(() => {
    if (mode !== 'show' || sequence.length === 0) return;
    if (flashIdx >= sequence.length) {
      recallStart.current = Date.now();
      setMode('recall');
      void hapticsRef.current.medium();
      return;
    }
    const em = sequence[flashIdx]!;
    setPulse({ emoji: em, visible: true });
    Animated.sequence([
      Animated.timing(beatScale, {
        toValue: 1.18,
        duration: BEAT_MS * 0.35,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(beatScale, {
        toValue: 1,
        duration: BEAT_MS * 0.45,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    const tm = setTimeout(() => {
      setFlashIdx((x) => x + 1);
      setPulse((p) => ({ ...p, visible: false }));
    }, BEAT_MS);
    return () => clearTimeout(tm);
  }, [mode, flashIdx, sequence, beatScale]);

  const finishFail = useCallback(() => {
    stats.current.roundsAttempted += 1;
    void hapticsRef.current.error();
    setSeqLen(3);
    setTimeout(() => startRound(3), 380);
  }, [startRound]);

  const finishSuccess = useCallback(
    (rt: number) => {
      stats.current.roundsAttempted += 1;
      stats.current.roundsCorrect += 1;
      stats.current.responseTimesMs.push(rt);
      stats.current.maxSequenceLength = Math.max(stats.current.maxSequenceLength, seqLen);
      void hapticsRef.current.success();
      const nextLen = Math.min(POOL_LIST.length, seqLen + 1);
      setSeqLen(nextLen);
      setFlashIdx(0);
      setTimeout(() => startRound(nextLen), 260);
    },
    [seqLen, startRound],
  );

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, endAt - Date.now());
      setRemainMs(r);
      if (r <= 0) {
        clearInterval(id);
        if (!finished.current) {
          finished.current = true;
          onDone({
            roundsAttempted: stats.current.roundsAttempted,
            roundsCorrect: stats.current.roundsCorrect,
            maxSequenceLength: stats.current.maxSequenceLength,
            responseTimesMs: [...stats.current.responseTimesMs],
          });
        }
      }
    }, 120);
    return () => clearInterval(id);
  }, [endAt, onDone]);

  const onTapIcon = (emoji: string) => {
    if (mode !== 'recall' || remainMs <= 0) return;
    const want = sequence[expected.current];
    if (!want) return;
    if (emoji !== want) {
      finishFail();
      return;
    }
    void hapticsRef.current.light();
    expected.current += 1;
    if (expected.current >= sequence.length) {
      const rt = Date.now() - recallStart.current;
      finishSuccess(rt);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <Text style={styles.time}>
          {t('brainRotTest.vibe.timeLeft', { sec: Math.ceil(remainMs / 1000) })}
        </Text>
        <Text style={styles.len}>
          {t('brainRotTest.vibe.synapseLen', { n: seqLen })}
        </Text>
      </View>
      <Text style={styles.phaseTitle}>{t('brainRotTest.vibe.phase.synapseTitle')}</Text>
      <Text style={styles.hint}>{t('brainRotTest.vibe.phase.synapseHint')}</Text>

      <View style={styles.stage}>
        {mode === 'show' && pulse.visible ? (
          <Animated.Text style={[styles.bigEmoji, { transform: [{ scale: beatScale }] }]}>{pulse.emoji}</Animated.Text>
        ) : mode === 'recall' ? (
          <Text style={styles.recallCue}>{t('brainRotTest.vibe.phase.synapseRecall')}</Text>
        ) : (
          <Text style={styles.waitCue}>…</Text>
        )}
      </View>

      <View style={styles.grid}>
        {gridOrder.map((em) => (
          <TouchableOpacity key={em} style={styles.cell} onPress={() => onTapIcon(em)} activeOpacity={0.8}>
            <Text style={styles.cellEmoji}>{em}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  time: { color: '#a78bfa', fontSize: 15, fontWeight: '800' },
  len: { color: '#67e8f9', fontSize: 14, fontWeight: '800' },
  phaseTitle: { color: '#888', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  hint: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 12, lineHeight: 21 },
  stage: { minHeight: 120, justifyContent: 'center', alignItems: 'center', marginVertical: 12 },
  bigEmoji: { fontSize: 72 },
  recallCue: { fontSize: 20, fontWeight: '800', color: '#fbbf24' },
  waitCue: { fontSize: 24, color: '#444' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 },
  cell: {
    width: '28%',
    aspectRatio: 1,
    maxWidth: 104,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellEmoji: { fontSize: 36 },
});
