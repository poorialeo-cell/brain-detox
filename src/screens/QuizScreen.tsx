import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { PartnerType, RootStackParamList } from '../types';
import { useHaptics } from '../hooks/useHaptics';
import GradientBackground from '../components/GradientBackground';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

const TOTAL_QUESTIONS = 5;
const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const ANSWER_KEYS = ['a0', 'a1', 'a2', 'a3'] as const;
const SCORE_MAP = [90, 65, 35, 10];
const PARTNER_MAP: PartnerType[] = ['teacher', 'counselor', 'scientist', 'trainer'];

function determinePartner(answers: number[]): PartnerType {
  const scores: Record<PartnerType, number> = {
    teacher: 0, counselor: 0, scientist: 0, trainer: 0,
  };
  scores[PARTNER_MAP[answers[3]]] += 2;
  scores[PARTNER_MAP[answers[4]]] += 1;
  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as PartnerType;
}

function calculateBrainScore(answers: number[]): number {
  return Math.round((SCORE_MAP[answers[0]] + SCORE_MAP[answers[1]] + SCORE_MAP[answers[2]]) / 3);
}

export default function QuizScreen({ navigation }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const { setSelectedPartner, setBrainScore } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;

  const advanceQuestion = useCallback(
    (newAnswers: number[], nextIndex: number) => {
      if (nextIndex < TOTAL_QUESTIONS) {
        translateX.setValue(width);
        setCurrentIndex(nextIndex);
        setIsAnimating(false);
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      } else {
        const partner = determinePartner(newAnswers);
        const score = calculateBrainScore(newAnswers);
        setSelectedPartner(partner);
        setBrainScore(score);
        setIsAnimating(false);
        navigation.navigate('PartnerResult', { partner });
      }
    },
    [translateX, navigation, setSelectedPartner, setBrainScore]
  );

  const handleBack = useCallback(() => {
    if (isAnimating || currentIndex === 0) return;
    haptics.light();
    setIsAnimating(true);

    Animated.timing(translateX, {
      toValue: width,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setAnswers((prev) => prev.slice(0, -1));
        setCurrentIndex((prev) => prev - 1);
        setIsAnimating(false);
        translateX.setValue(-width);
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    });
  }, [isAnimating, currentIndex, translateX, haptics]);

  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (isAnimating) return;
      haptics.light();
      setIsAnimating(true);
      const newAnswers = [...answers, answerIndex];
      setAnswers(newAnswers);

      Animated.timing(translateX, {
        toValue: -width,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) advanceQuestion(newAnswers, currentIndex + 1);
      });
    },
    [isAnimating, answers, currentIndex, translateX, advanceQuestion]
  );

  const currentQ = QUESTION_KEYS[currentIndex];
  const progress = (currentIndex + 1) / TOTAL_QUESTIONS;

  return (
    <GradientBackground variant="quiz">
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.progressLabelRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.backText, currentIndex === 0 && { opacity: 0 }]}>‹ 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.progressCount}>
            {currentIndex + 1}{' '}
            <Text style={styles.progressTotal}>/ {TOTAL_QUESTIONS}</Text>
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* スライドするコンテンツ */}
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
        <View style={styles.questionChip}>
          <Text style={styles.questionChipText}>Q{currentIndex + 1}</Text>
        </View>

        <Text style={styles.questionText}>{t(`quiz.${currentQ}.question`)}</Text>

        <View style={styles.answersContainer}>
          {ANSWER_KEYS.map((key, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.answerCard}
              onPress={() => handleAnswer(idx)}
              activeOpacity={0.75}
            >
              <View style={styles.answerBadge}>
                <Text style={styles.answerBadgeText}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text style={styles.answerText}>{t(`quiz.${currentQ}.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: { minWidth: 60, paddingVertical: 4 },
  backText: { color: '#a78bfa', fontSize: 15, fontWeight: '600' },
  progressCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#a78bfa',
  },
  progressTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#a78bfa',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  questionChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e1433',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 20,
  },
  questionChipText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
    marginBottom: 32,
  },
  answersContainer: {
    gap: 12,
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  answerBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1e1433',
    borderWidth: 1,
    borderColor: '#a78bfa44',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  answerBadgeText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
  },
  answerText: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
});
