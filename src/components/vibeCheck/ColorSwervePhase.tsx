import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Vibration,
} from 'react-native';
import { Canvas, Circle, vec } from '@shopify/react-native-skia';
import { useI18n } from '../../hooks/useI18n';
import { useHaptics } from '../../hooks/useHaptics';

const { width: W } = Dimensions.get('window');

const COLORS = [
  { id: 'red', i18nKey: 'brainRotTest.vibe.colors.red', fill: '#ef4444' },
  { id: 'blue', i18nKey: 'brainRotTest.vibe.colors.blue', fill: '#3b82f6' },
  { id: 'green', i18nKey: 'brainRotTest.vibe.colors.green', fill: '#22c55e' },
  { id: 'yellow', i18nKey: 'brainRotTest.vibe.colors.yellow', fill: '#eab308' },
] as const;

export type ColorSwerveStats = {
  correct: number;
  total: number;
  responseTimesMs: number[];
  maxCombo: number;
};

type Props = {
  durationMs: number;
  onDone: (stats: ColorSwerveStats) => void;
};

/** ストループ：表示文字の「インク色」に対応するボタンをタップ */
export default function ColorSwervePhase({ durationMs, onDone }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const endAt = useRef(Date.now() + durationMs).current;
  const finished = useRef(false);
  const [remainMs, setRemainMs] = useState(durationMs);
  const [wordIdx, setWordIdx] = useState(0);
  const [inkIdx, setInkIdx] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [flash, setFlash] = useState(false);
  const trialStart = useRef(Date.now());
  const stats = useRef({ correct: 0, total: 0, responseTimesMs: [] as number[], maxCombo: 0 });

  const shakeX = useRef(new Animated.Value(0)).current;
  const glitchOp = useRef(new Animated.Value(0)).current;

  const nextTrial = useCallback(() => {
    const w = Math.floor(Math.random() * COLORS.length);
    let ink = Math.floor(Math.random() * COLORS.length);
    if (Math.random() < 0.78) {
      while (ink === w) ink = Math.floor(Math.random() * COLORS.length);
    }
    setWordIdx(w);
    setInkIdx(ink);
    trialStart.current = Date.now();
  }, []);

  useEffect(() => {
    nextTrial();
  }, [nextTrial]);

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, endAt - Date.now());
      setRemainMs(r);
      if (r <= 0) {
        clearInterval(id);
        if (!finished.current) {
          finished.current = true;
          onDone({
            correct: stats.current.correct,
            total: stats.current.total,
            responseTimesMs: [...stats.current.responseTimesMs],
            maxCombo: stats.current.maxCombo,
          });
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [endAt, onDone]);

  const runGlitch = () => {
    Animated.sequence([
      Animated.timing(glitchOp, { toValue: 0.35, duration: 60, useNativeDriver: true }),
      Animated.timing(glitchOp, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onPick = (pickedInk: number) => {
    if (remainMs <= 0) return;
    const rt = Date.now() - trialStart.current;
    stats.current.total += 1;

    if (pickedInk === inkIdx) {
      stats.current.correct += 1;
      stats.current.responseTimesMs.push(rt);
      const nc = combo + 1;
      setCombo(nc);
      const mc = Math.max(maxCombo, nc);
      setMaxCombo(mc);
      stats.current.maxCombo = Math.max(stats.current.maxCombo, nc);
      void haptics.light();
      if (nc >= 3) {
        setFlash(true);
        setTimeout(() => setFlash(false), 110);
        void haptics.success();
      }
      setTimeout(nextTrial, 140);
    } else {
      setCombo(0);
      stats.current.maxCombo = Math.max(stats.current.maxCombo, maxCombo);
      void haptics.error();
      Vibration.vibrate(42);
      runGlitch();
      setTimeout(nextTrial, 320);
    }
  };

  const wordText = t(COLORS[wordIdx].i18nKey);
  const inkHex = COLORS[inkIdx].fill;

  const flashColor = useMemo(() => COLORS[Math.max(0, combo - 1) % COLORS.length].fill + '99', [combo]);

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <Text style={styles.time}>
          {t('brainRotTest.vibe.timeLeft', { sec: Math.ceil(remainMs / 1000) })}
        </Text>
        <Text style={styles.combo}>{t('brainRotTest.vibe.combo', { n: combo })}</Text>
      </View>
      <Text style={styles.phaseTitle}>{t('brainRotTest.vibe.phase.colorTitle')}</Text>
      <Text style={styles.hint}>{t('brainRotTest.vibe.phase.colorHint')}</Text>

      <View style={styles.stroopRow}>
        <Animated.View style={[styles.glitchWrap, { transform: [{ translateX: shakeX }] }]}>
          <Animated.View style={[styles.glitchTint, { opacity: glitchOp }]} />
          <Text style={[styles.stroopWord, { color: inkHex }]}>{wordText}</Text>
        </Animated.View>
      </View>

      <View style={styles.btns}>
        {COLORS.map((c, i) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.colorBtn, { backgroundColor: c.fill }]}
            onPress={() => onPick(i)}
            activeOpacity={0.82}
          >
            <Text style={styles.colorBtnSpacer}> </Text>
          </TouchableOpacity>
        ))}
      </View>

      {flash ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle c={vec(W / 2, 180)} r={Math.min(W, 420) * 0.55} color={flashColor} opacity={0.55} />
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  time: { color: '#a78bfa', fontSize: 15, fontWeight: '800' },
  combo: { color: '#4ade80', fontSize: 15, fontWeight: '800' },
  phaseTitle: { color: '#888', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  hint: { color: '#ccc', fontSize: 15, fontWeight: '600', marginBottom: 20, lineHeight: 22 },
  stroopRow: { alignItems: 'center' },
  glitchWrap: { position: 'relative', paddingVertical: 8, paddingHorizontal: 24 },
  glitchTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f87171',
    borderRadius: 12,
  },
  stroopWord: { fontSize: 56, fontWeight: '900', textAlign: 'center', marginVertical: 28 },
  btns: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 24, flexWrap: 'wrap' },
  colorBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#00000055',
  },
  colorBtnSpacer: { opacity: 0 },
});
