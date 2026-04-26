import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { BreathingConfig } from '../types';

type Phase = 'ready' | 'inhale' | 'hold' | 'exhale';

interface Props {
  config: BreathingConfig;
  partnerColor: string;
  onComplete: () => void;
  onSkip: () => void;
}

const CIRCLE_SIZE = 200;

export default function BreathingGuide({ config, partnerColor, onComplete, onSkip }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const { inhaleSeconds, holdSeconds, exhaleSeconds, cycles } = config;

  const [phase, setPhase] = useState<Phase>('ready');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [countdown, setCountdown] = useState(inhaleSeconds);
  const [started, setStarted] = useState(false);

  const circleScale = useRef(new Animated.Value(0.45)).current;
  const circleOpacity = useRef(new Animated.Value(0.6)).current;
  const glowScale = useRef(new Animated.Value(0.45)).current;

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

  // フェーズ制御
  useEffect(() => {
    if (!started || phase === 'ready') return;

    const phaseDuration =
      phase === 'inhale' ? inhaleSeconds :
      phase === 'hold'   ? holdSeconds   :
                           exhaleSeconds;

    animatePhase(phase);

    // カウントダウン
    let remaining = phaseDuration;
    setCountdown(remaining);
    const countInterval = setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(0, remaining));
    }, 1000);

    // 次のフェーズへ
    const phaseTimer = setTimeout(() => {
      clearInterval(countInterval);

      if (phase === 'inhale') {
        if (holdSeconds > 0) setPhase('hold');
        else setPhase('exhale');
      } else if (phase === 'hold') {
        setPhase('exhale');
      } else {
        // exhale完了
        haptics.success();
        if (currentCycle >= cycles) {
          onComplete();
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
  }, [phase, started, currentCycle]);

  const handleStart = () => {
    haptics.medium();
    setStarted(true);
    setPhase('inhale');
    setCountdown(inhaleSeconds);
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

      {/* サイクルカウンター */}
      {started && (
        <View style={styles.cycleRow}>
          {Array.from({ length: cycles }, (_, i) => (
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

      {/* 呼吸サークル */}
      <View style={styles.circleWrapper}>
        {/* 外側グロー */}
        <Animated.View
          style={[
            styles.glowRing,
            { backgroundColor: getPhaseColor() + '20', transform: [{ scale: glowScale }] },
          ]}
        />
        {/* メインサークル */}
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
        </Animated.View>
      </View>

      {/* サイクル表示 */}
      {started && (
        <Text style={styles.cycleLabel}>
          {currentCycle} {t('breathing.cycleOf', { total: cycles })}
        </Text>
      )}

      {/* スキップボタン */}
      <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.7}>
        <Text style={styles.skipText}>{t('action.guideSkip')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  cycleRow: {
    flexDirection: 'row', gap: 8,
  },
  cycleDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#333',
  },
  cycleDotDone: {
    backgroundColor: '#4ade80',
  },
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
    fontSize: 20, fontWeight: '800', letterSpacing: 1,
  },
  countdown: {
    fontSize: 40, fontWeight: '900', color: '#fff',
  },
  startTap: {
    fontSize: 36, fontWeight: '900',
  },
  cycleLabel: {
    fontSize: 14, color: '#555', fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
  },
  skipText: {
    color: '#444', fontSize: 14, fontWeight: '600',
  },
});
