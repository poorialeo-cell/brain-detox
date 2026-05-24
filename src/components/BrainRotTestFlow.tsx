import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
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
});
