import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { useAppStore } from '../store/useAppStore';
import { sendTimerActionFinishedNotification } from '../services/notificationService';
import { TimerConfig } from '../types';

interface Props {
  config: TimerConfig;
  partnerColor: string;
  actionTitle: string;
  onComplete: (activeSeconds: number) => void;
  onSkip: (activeSeconds: number) => void;
  onCancel: () => void;
}

const SVG_SIZE = 220;
const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Phase = 'run' | 'askExtend';

export default function TimerGuide({
  config, partnerColor, actionTitle, onComplete, onSkip, onCancel,
}: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const selectedPartner = useAppStore((s) => s.selectedPartner ?? 'counselor');
  const { durationSeconds: initialDuration } = config;

  const [remaining, setRemaining] = useState(initialDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<Phase>('run');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const elapsedRef = useRef(0);
  const totalBudgetRef = useRef(initialDuration);
  const timerEndNotifiedRef = useRef(false);
  /** ガイドを開いてからの経過（一時停止中も含む。スキップ時の実績秒に使う） */
  const guideOpenedAtRef = useRef(Date.now());

  const progress = totalBudgetRef.current > 0 ? remaining / totalBudgetRef.current : 0;
  const strokeDashoffset = CIRCUMFERENCE * progress;

  useEffect(() => {
    if (phase !== 'run' || isPaused) return;

    const interval = setInterval(() => {
      elapsedRef.current += 1;
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!timerEndNotifiedRef.current) {
            timerEndNotifiedRef.current = true;
            void sendTimerActionFinishedNotification(
              selectedPartner,
              actionTitle,
              notificationsEnabled,
            );
          }
          setPhase('askExtend');
          haptics.success();
          return 0;
        }
        if ((prev - 1) % 10 === 0 && prev - 1 > 0) haptics.light();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isPaused, selectedPartner, actionTitle, notificationsEnabled]);

  useEffect(() => {
    if (phase !== 'askExtend') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(1);
    };
  }, [phase, pulseAnim]);

  const handlePauseResume = () => {
    haptics.light();
    setIsPaused((p) => !p);
  };

  const extend = (extra: number) => {
    haptics.medium();
    timerEndNotifiedRef.current = false;
    totalBudgetRef.current += extra;
    setRemaining((r) => r + extra);
    setPhase('run');
  };

  const resolveActiveSeconds = (): number => {
    const wallSec = Math.floor((Date.now() - guideOpenedAtRef.current) / 1000);
    const countdownConsumed = Math.max(0, totalBudgetRef.current - remaining);
    return Math.max(wallSec, countdownConsumed, elapsedRef.current);
  };

  const handleDone = () => {
    haptics.success();
    onComplete(resolveActiveSeconds());
  };

  const handleSkip = () => {
    haptics.light();
    onSkip(resolveActiveSeconds());
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelText}>{t('guide.cancel')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{actionTitle}</Text>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} style={styles.svg}>
          <Circle
            cx={SVG_SIZE / 2} cy={SVG_SIZE / 2} r={RADIUS}
            fill="none" stroke="#222" strokeWidth={6}
          />
          <Circle
            cx={SVG_SIZE / 2} cy={SVG_SIZE / 2} r={RADIUS}
            fill="none"
            stroke={phase === 'askExtend' ? '#4ade80' : partnerColor}
            strokeWidth={6}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>

        <View style={styles.centerContent}>
          {phase === 'askExtend' ? (
            <Text style={styles.completeEmoji}>⏱</Text>
          ) : (
            <>
              <Text style={[styles.timeText, { color: partnerColor }]}>
                {formatTime(remaining)}
              </Text>
              <Text style={styles.totalText}>/ {formatTime(totalBudgetRef.current)}</Text>
            </>
          )}
        </View>
      </Animated.View>

      {phase === 'askExtend' ? (
        <View style={styles.extendBlock}>
          <Text style={styles.extendQuestion}>{t('guide.timerExtendQuestion')}</Text>
          <View style={styles.extendRow}>
            <TouchableOpacity style={[styles.extendChip, { borderColor: partnerColor + '66' }]} onPress={() => extend(60)} activeOpacity={0.85}>
              <Text style={[styles.extendChipText, { color: partnerColor }]}>{t('guide.extendMinutes', { n: 1 })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.extendChip, { borderColor: partnerColor + '66' }]} onPress={() => extend(120)} activeOpacity={0.85}>
              <Text style={[styles.extendChipText, { color: partnerColor }]}>{t('guide.extendMinutes', { n: 2 })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.extendChip, { borderColor: partnerColor + '66' }]} onPress={() => extend(300)} activeOpacity={0.85}>
              <Text style={[styles.extendChipText, { color: partnerColor }]}>{t('guide.extendMinutes', { n: 5 })}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: '#4ade80' }]} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.mainBtnText}>{t('guide.finishWithElapsed')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: partnerColor + '22', borderWidth: 1, borderColor: partnerColor + '55' }]}
            onPress={handlePauseResume}
            activeOpacity={0.8}
          >
            <Text style={[styles.mainBtnText, { color: partnerColor }]}>
              {isPaused ? t('timer.resume') : t('timer.pause')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>{t('action.guideSkip')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  topBar: { width: '100%', alignItems: 'flex-start' },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  cancelText: { color: '#888', fontSize: 15, fontWeight: '700' },
  title: {
    fontSize: 20, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 28,
  },
  svg: { transform: [{ rotate: '-90deg' }] },
  centerContent: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  timeText: { fontSize: 42, fontWeight: '900', letterSpacing: 1 },
  totalText: { fontSize: 14, color: '#555', fontWeight: '600' },
  completeEmoji: { fontSize: 52 },
  extendBlock: { width: '100%', gap: 14 },
  extendQuestion: { fontSize: 16, fontWeight: '700', color: '#ccc', textAlign: 'center', lineHeight: 24 },
  extendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  extendChip: {
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#161616',
  },
  extendChipText: { fontSize: 13, fontWeight: '800' },
  buttons: { width: '100%', gap: 12 },
  mainBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  mainBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#444', fontSize: 14, fontWeight: '600' },
});
