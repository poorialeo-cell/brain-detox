import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { calculateTestResult } from '../services/scoringService';

const { width } = Dimensions.get('window');
const TOTAL_Q = 3;
const ANSWER_KEYS = ['a0', 'a1', 'a2', 'a3'] as const;

interface Props {
  onComplete: (delta: number) => void;
  onSkip: () => void;
  showSkipButton?: boolean;
  showBadge?: boolean;
}

export default function BrainRotTestFlow({
  onComplete, onSkip, showSkipButton = true, showBadge = false,
}: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale   = useRef(new Animated.Value(0.85)).current;

  const slideIn = useCallback((fromRight: boolean) => {
    translateX.setValue(fromRight ? width : -width);
    Animated.timing(translateX, {
      toValue: 0, duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  // 前の問いに戻る
  const handleBack = useCallback(() => {
    if (isAnimating || currentIdx === 0) return;
    haptics.light();
    setIsAnimating(true);

    Animated.timing(translateX, {
      toValue: width, duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setAnswers((prev) => prev.slice(0, -1));
        setCurrentIdx((prev) => prev - 1);
        setIsAnimating(false);
        slideIn(false); // 左から入ってくる
      }
    });
  }, [isAnimating, currentIdx, translateX, haptics, slideIn]);

  const handleFinish = useCallback((finalAnswers: number[]) => {
    const delta = calculateTestResult(finalAnswers);
    setResult(delta);
    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(resultScale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, [resultOpacity, resultScale]);

  const handleAnswer = useCallback((answerIdx: number) => {
    if (isAnimating) return;
    haptics.light();
    setIsAnimating(true);
    const newAnswers = [...answers, answerIdx];
    setAnswers(newAnswers);

    Animated.timing(translateX, {
      toValue: -width, duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (currentIdx + 1 < TOTAL_Q) {
        translateX.setValue(width);
        setCurrentIdx((prev) => prev + 1);
        setIsAnimating(false);
        Animated.timing(translateX, {
          toValue: 0, duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      } else {
        setIsAnimating(false);
        handleFinish(newAnswers);
      }
    });
  }, [isAnimating, answers, currentIdx, translateX, haptics, handleFinish]);

  const qKey = `q${currentIdx + 1}` as 'q1' | 'q2' | 'q3';
  const progress = (currentIdx + 1) / TOTAL_Q;

  const getResultLabel = () => {
    if (result === null) return '';
    if (result > 0) return t('brainRotTest.resultPositive');
    if (result === 0) return t('brainRotTest.resultNeutral');
    return t('brainRotTest.resultNegative');
  };

  const getResultColor = () => {
    if (result === null) return '#a78bfa';
    if (result > 0) return '#4ade80';
    if (result === 0) return '#a78bfa';
    return '#f87171';
  };

  if (result !== null) {
    return (
      <Animated.View style={[styles.resultContainer, { opacity: resultOpacity, transform: [{ scale: resultScale }] }]}>
        <Text style={styles.resultEmoji}>
          {result > 0 ? '🧠✨' : result === 0 ? '🧠' : '🧠💊'}
        </Text>
        <Text style={[styles.resultDelta, { color: getResultColor() }]}>
          {result > 0 ? `+${result}pt` : result === 0 ? '±0pt' : `${result}pt`}
        </Text>
        <Text style={styles.resultScoreLabel}>{t('brainRotTest.scoreDelta')}</Text>
        <Text style={[styles.resultMessage, { color: getResultColor() }]}>{getResultLabel()}</Text>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: getResultColor() }]}
          onPress={() => onComplete(result)}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>{t('brainRotTest.continueButton')}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー：戻る + バッジ + スキップ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, currentIdx === 0 && styles.backBtnHidden]}
          disabled={currentIdx === 0}
        >
          <Text style={styles.backText}>‹ {t('brainRotTest.backButton')}</Text>
        </TouchableOpacity>

        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('brainRotTest.badge')}</Text>
          </View>
        )}

        {showSkipButton ? (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('brainRotTest.skipButton')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* プログレスバー */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{t('brainRotTest.title')}</Text>
          <Text style={styles.progressCount}>
            {currentIdx + 1}<Text style={styles.progressTotal}> / {TOTAL_Q}</Text>
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* 質問エリア（スライドアニメーション） */}
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
        <View style={styles.questionChip}>
          <Text style={styles.questionChipText}>Q{currentIdx + 1}</Text>
        </View>
        <Text style={styles.questionText}>{t(`brainRotTest.${qKey}.question`)}</Text>
        <View style={styles.answersContainer}>
          {ANSWER_KEYS.map((key, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.answerCard}
              onPress={() => handleAnswer(idx)}
              activeOpacity={0.75}
            >
              <View style={styles.answerBadge}>
                <Text style={styles.answerBadgeText}>{String.fromCharCode(65 + idx)}</Text>
              </View>
              <Text style={styles.answerText}>{t(`brainRotTest.${qKey}.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backBtnHidden: { opacity: 0 },
  backText: { color: '#a78bfa', fontSize: 15, fontWeight: '600' },
  badge: {
    backgroundColor: '#1e1433', borderWidth: 1, borderColor: '#a78bfa44',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '700' },
  skipBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  skipText: { color: '#555', fontSize: 14, fontWeight: '600' },

  progressContainer: { paddingHorizontal: 22, paddingBottom: 12 },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: '700', color: '#777' },
  progressCount: { fontSize: 18, fontWeight: '800', color: '#a78bfa' },
  progressTotal: { fontSize: 13, color: '#555', fontWeight: '500' },
  progressBarBg: { height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 2 },

  content: { flex: 1, paddingHorizontal: 22 },
  questionChip: {
    alignSelf: 'flex-start', backgroundColor: '#1e1433',
    borderWidth: 1, borderColor: '#a78bfa', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, marginBottom: 18,
  },
  questionChipText: { color: '#a78bfa', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  questionText: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 32, marginBottom: 28 },
  answersContainer: { gap: 12 },
  answerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 14, padding: 16, gap: 14,
  },
  answerBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#1e1433', borderWidth: 1, borderColor: '#a78bfa44',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  answerBadgeText: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },
  answerText: { color: '#e0e0e0', fontSize: 15, fontWeight: '500', flex: 1, lineHeight: 22 },

  resultContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  resultEmoji: { fontSize: 64, marginBottom: 8 },
  resultDelta: { fontSize: 48, fontWeight: '900' },
  resultScoreLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  resultMessage: { fontSize: 17, fontWeight: '700', textAlign: 'center', lineHeight: 26 },
  continueBtn: {
    marginTop: 16, borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 48, alignItems: 'center',
  },
  continueBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
});
