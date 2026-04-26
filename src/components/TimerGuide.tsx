import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { TimerConfig } from '../types';

interface Props {
  config: TimerConfig;
  partnerColor: string;
  actionTitle: string;
  onComplete: () => void;
  onSkip: () => void;
}

const SVG_SIZE    = 220;
const RADIUS      = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerGuide({ config, partnerColor, actionTitle, onComplete, onSkip }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const { durationSeconds } = config;

  const [remaining, setRemaining] = useState(durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const progress = remaining / durationSeconds;
  const strokeDashoffset = CIRCUMFERENCE * progress;

  // 完了時のパルス
  useEffect(() => {
    if (isComplete) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
        ])
      ).start();
      haptics.success();
    }
  }, [isComplete]);

  useEffect(() => {
    if (isPaused || isComplete) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsComplete(true);
          return 0;
        }
        // 10秒ごとにハプティクス
        if ((prev - 1) % 10 === 0 && prev - 1 > 0) haptics.light();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isComplete]);

  const handlePauseResume = () => {
    haptics.light();
    setIsPaused((p) => !p);
  };

  const handleFinish = () => {
    haptics.success();
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* アクションタイトル */}
      <Text style={styles.title}>{actionTitle}</Text>

      {/* SVG 円形プログレス */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} style={styles.svg}>
          {/* 背景トラック */}
          <Circle
            cx={SVG_SIZE / 2} cy={SVG_SIZE / 2} r={RADIUS}
            fill="none" stroke="#222" strokeWidth={6}
          />
          {/* プログレス */}
          <Circle
            cx={SVG_SIZE / 2} cy={SVG_SIZE / 2} r={RADIUS}
            fill="none"
            stroke={isComplete ? '#4ade80' : partnerColor}
            strokeWidth={6}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>

        {/* 中央の時間表示 */}
        <View style={styles.centerContent}>
          {isComplete ? (
            <Text style={styles.completeEmoji}>✅</Text>
          ) : (
            <>
              <Text style={[styles.timeText, { color: partnerColor }]}>
                {formatTime(remaining)}
              </Text>
              <Text style={styles.totalText}>/ {formatTime(durationSeconds)}</Text>
            </>
          )}
        </View>
      </Animated.View>

      {/* 完了メッセージ */}
      {isComplete && (
        <Text style={styles.completeText}>{t('timer.complete')}</Text>
      )}

      {/* ボタン */}
      <View style={styles.buttons}>
        {isComplete ? (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: '#4ade80' }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.mainBtnText}>{t('timer.finish')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: partnerColor + '22', borderWidth: 1, borderColor: partnerColor + '55' }]}
            onPress={handlePauseResume}
            activeOpacity={0.8}
          >
            <Text style={[styles.mainBtnText, { color: partnerColor }]}>
              {isPaused ? t('timer.resume') : t('timer.pause')}
            </Text>
          </TouchableOpacity>
        )}

        {!isComplete && (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>{t('action.guideSkip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 20,
  },
  title: {
    fontSize: 20, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 28,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  centerContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  timeText: {
    fontSize: 42, fontWeight: '900', letterSpacing: 1,
  },
  totalText: {
    fontSize: 14, color: '#555', fontWeight: '600',
  },
  completeEmoji: {
    fontSize: 52,
  },
  completeText: {
    fontSize: 18, fontWeight: '700', color: '#4ade80',
  },
  buttons: {
    width: '100%', gap: 12,
  },
  mainBtn: {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  mainBtnText: {
    fontSize: 16, fontWeight: '800', color: '#000',
  },
  skipBtn: {
    alignItems: 'center', paddingVertical: 12,
  },
  skipText: {
    color: '#444', fontSize: 14, fontWeight: '600',
  },
});
