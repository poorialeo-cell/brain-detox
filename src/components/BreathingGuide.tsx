import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { BreathingConfig } from '../types';

type Phase = 'ready' | 'inhale' | 'hold' | 'exhale';

type SessionPhase = 'breathing' | 'afterCycles';

interface Props {
  config: BreathingConfig;
  partnerColor: string;
  onComplete: (activeSeconds: number) => void;
  onSkip: (activeSeconds: number) => void;
  onCancel: () => void;
}

const CIRCLE_SIZE = 200;
const EXTRA_CYCLES = 2;

export default function BreathingGuide({ config, partnerColor, onComplete, onSkip, onCancel }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const { inhaleSeconds, holdSeconds, exhaleSeconds, cycles: initialCycles } = config;

  const [phase, setPhase] = useState<Phase>('ready');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [countdown, setCountdown] = useState(inhaleSeconds);
  const [started, setStarted] = useState(false);
  const [targetCycles, setTargetCycles] = useState(initialCycles);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('breathing');

  const circleScale = useRef(new Animated.Value(0.45)).current;
  const circleOpacity = useRef(new Animated.Value(0.6)).current;
  const glowScale = useRef(new Animated.Value(0.45)).current;
  const elapsedRef = useRef(0);
  const openedAtRef = useRef(Date.now());
  // セッション（実際に呼吸を始めた時刻）を記録。`handleStart` で代入される。
  const sessionStartedAtRef = useRef<number | null>(null);

  // 全 Animated を unmount 時に停止（戻る/タブ切替などのリーク防止）
  useEffect(() => {
    return () => {
      circleScale.stopAnimation();
      circleOpacity.stopAnimation();
      glowScale.stopAnimation();
    };
  }, [circleScale, circleOpacity, glowScale]);

  const cycleLen = inhaleSeconds + holdSeconds + exhaleSeconds;

  /** 呼吸フェーズから推定する実施秒（いまのサイクル途中まで） */
  const getPhaseElapsedEstimate = (): number => {
    if (!started) return 0;
    if (sessionPhase === 'afterCycles') {
      return Math.max(0, elapsedRef.current);
    }
    const completedCycles = Math.max(0, currentCycle - 1);
    let sec = completedCycles * cycleLen;
    if (phase === 'ready') return sec;
    const dur =
      phase === 'inhale' ? inhaleSeconds : phase === 'hold' ? holdSeconds : exhaleSeconds;
    const inPhase = Math.min(dur, Math.max(0, dur - countdown));
    return sec + inPhase;
  };

  useEffect(() => {
    if (!started) return;
    if (sessionPhase === 'breathing' && phase === 'ready') return;
    const id = setInterval(() => {
      elapsedRef.current += 1;
    }, 1000);
    return () => clearInterval(id);
  }, [started, phase, sessionPhase]);

  const animatePhase = useCallback((toPhase: Phase) => {
    let toValue: number;
    let duration: number;

    if (toPhase === 'inhale') {
      toValue = 1.0; duration = inhaleSeconds * 1000;
      haptics.light();
    } else if (toPhase === 'hold') {
      toValue = 1.0; duration = holdSeconds * 1000;
      haptics.medium();
    } else {
      toValue = 0.45; duration = exhaleSeconds * 1000;
      haptics.light();
    }

    Animated.parallel([
      Animated.timing(circleScale, {
        toValue, duration,
        easing: toPhase === 'inhale' ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: toValue * 1.3, duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacity, {
        toValue: toPhase === 'exhale' ? 0.5 : 0.9,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ]).start();
  }, [circleScale, glowScale, circleOpacity, inhaleSeconds, holdSeconds, exhaleSeconds, haptics]);

  useEffect(() => {
    if (!started) return;
    if (sessionPhase !== 'breathing') return;
    if (phase === 'ready') return;

    const phaseDuration =
      phase === 'inhale' ? inhaleSeconds :
      phase === 'hold' ? holdSeconds :
        exhaleSeconds;

    animatePhase(phase);

    let remaining = phaseDuration;
    setCountdown(remaining);
    const countInterval = setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(0, remaining));
    }, 1000);

    const phaseTimer = setTimeout(() => {
      clearInterval(countInterval);

      if (phase === 'inhale') {
        if (holdSeconds > 0) setPhase('hold');
        else setPhase('exhale');
      } else if (phase === 'hold') {
        setPhase('exhale');
      } else {
        haptics.success();
        if (currentCycle >= targetCycles) {
          setSessionPhase('afterCycles');
        } else {
          setCurrentCycle((c) => c + 1);
          setPhase('inhale');
        }
      }
    }, phaseDuration * 1000);

    return () => {
      clearInterval(countInterval);
      clearTimeout(phaseTimer);
    };
  }, [phase, started, currentCycle, sessionPhase, targetCycles, inhaleSeconds, holdSeconds, exhaleSeconds, animatePhase]);

  const handleStart = () => {
    haptics.medium();
    setStarted(true);
    setPhase('inhale');
    setCountdown(inhaleSeconds);
    elapsedRef.current = 0;
    sessionStartedAtRef.current = Date.now();
  };

  const handleAddCycles = () => {
    haptics.medium();
    setTargetCycles((c) => c + EXTRA_CYCLES);
    setCurrentCycle(1);
    setPhase('inhale');
    setSessionPhase('breathing');
  };

  const handleFinishBreathing = () => {
    haptics.success();
    const wallAnchor = sessionStartedAtRef.current ?? openedAtRef.current;
    const wallSec = Math.floor((Date.now() - wallAnchor) / 1000);
    const activeSec = Math.max(getPhaseElapsedEstimate(), wallSec, elapsedRef.current);
    onComplete(Math.max(15, activeSec));
  };

  const handleSkipPress = () => {
    haptics.light();
    const phaseEst = getPhaseElapsedEstimate();
    const wallAnchor = sessionStartedAtRef.current ?? openedAtRef.current;
    const wallSec = Math.floor((Date.now() - wallAnchor) / 1000);
    const fromTicker = Math.max(0, elapsedRef.current);
    let activeSec = Math.max(phaseEst, wallSec, fromTicker);
    if (!started) {
      activeSec = Math.max(wallSec, Math.round(cycleLen * 0.2));
    }
    onSkip(activeSec);
  };

  const getPhaseLabel = () => {
    if (phase === 'ready') return t('breathing.ready');
    if (phase === 'inhale') return t('breathing.inhale');
    if (phase === 'hold') return t('breathing.hold');
    return t('breathing.exhale');
  };

  const getPhaseColor = () => {
    if (phase === 'inhale') return partnerColor;
    if (phase === 'hold') return '#a78bfa';
    return '#67e8f9';
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelText}>{t('guide.cancel')}</Text>
        </TouchableOpacity>
      </View>

      {sessionPhase === 'breathing' && started && (
        <View style={styles.cycleRow}>
          {Array.from({ length: targetCycles }, (_, i) => (
            <View
              key={i}
              style={[
                styles.cycleDot,
                i < currentCycle - 1 && styles.cycleDotDone,
                i === currentCycle - 1 && { backgroundColor: getPhaseColor() },
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.circleWrapper}>
        <Animated.View
          style={[
            styles.glowRing,
            { backgroundColor: getPhaseColor() + '20', transform: [{ scale: glowScale }] },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: getPhaseColor() + '33',
              borderColor: getPhaseColor(),
              opacity: circleOpacity,
              transform: [{ scale: circleScale }],
            },
          ]}
        >
          {sessionPhase === 'afterCycles' ? (
            <Text style={[styles.phaseLabel, { color: '#4ade80', textAlign: 'center', paddingHorizontal: 8 }]}>
              {t('breathing.cycleComplete')}
            </Text>
          ) : (
            <>
              <Text style={[styles.phaseLabel, { color: getPhaseColor() }]}>
                {getPhaseLabel()}
              </Text>
              {started && phase !== 'ready' && (
                <Text style={styles.countdown}>{countdown}</Text>
              )}
              {!started && (
                <TouchableOpacity onPress={handleStart} activeOpacity={0.8}>
                  <Text style={[styles.startTap, { color: getPhaseColor() }]}>▶</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </View>

      {sessionPhase === 'breathing' && started && (
        <Text style={styles.cycleLabel}>
          {currentCycle} {t('breathing.cycleOf', { total: targetCycles })}
        </Text>
      )}

      {sessionPhase === 'afterCycles' && (
        <View style={styles.afterBlock}>
          <Text style={styles.afterQuestion}>{t('guide.breathingContinueQuestion')}</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: partnerColor }]} onPress={handleAddCycles} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>{t('guide.breathingAddCycles', { n: EXTRA_CYCLES })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#4ade80' }]} onPress={handleFinishBreathing} activeOpacity={0.85}>
            <Text style={[styles.secondaryBtnText, { color: '#4ade80' }]}>{t('guide.finishWithElapsed')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {sessionPhase === 'breathing' && (
        <TouchableOpacity onPress={handleSkipPress} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('action.guideSkip')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  topBar: { width: '100%', paddingHorizontal: 24, alignItems: 'flex-start' },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  cancelText: { color: '#888', fontSize: 15, fontWeight: '700' },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  cycleDotDone: { backgroundColor: '#4ade80' },
  circleWrapper: {
    width: CIRCLE_SIZE + 80, height: CIRCLE_SIZE + 80,
    justifyContent: 'center', alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 80, height: CIRCLE_SIZE + 80,
    borderRadius: (CIRCLE_SIZE + 80) / 2,
  },
  circle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  phaseLabel: {
    fontSize: 18, fontWeight: '800', letterSpacing: 1, textAlign: 'center',
  },
  countdown: { fontSize: 40, fontWeight: '900', color: '#fff' },
  startTap: { fontSize: 36, fontWeight: '900' },
  cycleLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  afterBlock: { width: '100%', paddingHorizontal: 20, gap: 12 },
  afterQuestion: { fontSize: 15, fontWeight: '700', color: '#aaa', textAlign: 'center', lineHeight: 22 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: '#000' },
  secondaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, backgroundColor: '#141414' },
  secondaryBtnText: { fontSize: 15, fontWeight: '800' },
  skipBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  skipText: { color: '#444', fontSize: 14, fontWeight: '600' },
});
