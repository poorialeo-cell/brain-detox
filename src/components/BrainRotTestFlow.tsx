import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import VibeCheckFlow from './VibeCheckFlow';

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

  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale   = useRef(new Animated.Value(0.85)).current;

  const handleVibeFinish = useCallback((delta: number) => {
    setResult(delta);
    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(resultScale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, [resultOpacity, resultScale]);

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

  if (!started) {
    return (
      <View style={styles.introOuter}>
        <View style={styles.introHeader}>
          <View style={styles.introHeaderSpacer} />
          {showSkipButton ? (
            <TouchableOpacity onPress={onSkip} style={styles.introSkipBtn} hitSlop={12}>
              <Text style={styles.introSkipText}>{t('brainRotTest.skipButton')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.introSkipBtn} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.introScroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.introBrain}>🧠</Text>
          <Text style={styles.introHeading}>{t('brainRotTest.intro.heading')}</Text>
          <Text style={styles.introDuration}>{t('brainRotTest.intro.duration')}</Text>
          <Text style={styles.introDesc}>{t('brainRotTest.intro.description')}</Text>

          <View style={styles.phaseList}>
            {(['phase1', 'phase2', 'phase3'] as const).map((key, i) => (
              <View key={key} style={styles.phaseRow}>
                <View style={styles.phaseNumBadge}>
                  <Text style={styles.phaseNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.phaseLabel}>{t(`brainRotTest.intro.${key}`)}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => setStarted(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>{t('brainRotTest.intro.startButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VibeCheckFlow
        onCompleteDelta={handleVibeFinish}
        onSkip={onSkip}
        showSkipButton={showSkipButton}
        showBadge={showBadge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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

  introOuter: { flex: 1 },
  introHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  introHeaderSpacer: { minWidth: 64 },
  introSkipBtn: { minWidth: 64, paddingVertical: 8, alignItems: 'flex-end' },
  introSkipText: { color: '#555', fontSize: 14, fontWeight: '600' },
  introScroll: {
    paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center',
  },
  introBrain: { fontSize: 56, marginTop: 16, marginBottom: 12 },
  introHeading: {
    fontSize: 22, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 8,
  },
  introDuration: {
    fontSize: 13, fontWeight: '600', color: '#a78bfa',
    backgroundColor: '#1e1433',
    borderWidth: 1, borderColor: '#a78bfa44',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 18, overflow: 'hidden',
  },
  introDesc: {
    fontSize: 15, color: '#aaa', textAlign: 'center',
    lineHeight: 24, marginBottom: 24,
  },
  phaseList: {
    width: '100%', gap: 10, marginBottom: 32,
  },
  phaseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 14, padding: 14, gap: 12,
  },
  phaseNumBadge: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#1e1433',
    borderWidth: 1, borderColor: '#a78bfa44',
    justifyContent: 'center', alignItems: 'center',
  },
  phaseNumText: { color: '#a78bfa', fontSize: 13, fontWeight: '800' },
  phaseLabel: { color: '#e0e0e0', fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },
  startBtn: {
    width: '100%', backgroundColor: '#a78bfa',
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
});

