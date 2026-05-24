import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { calculateVibeCheckDelta, type VibeCheckMetrics } from '../services/vibeCheckScoring';
import ColorSwervePhase from './vibeCheck/ColorSwervePhase';
import SynapseMatchPhase from './vibeCheck/SynapseMatchPhase';
import FocusShieldPhase from './vibeCheck/FocusShieldPhase';

const PHASE_COLOR_MS = 60_000;
const PHASE_SYNAPSE_MS = 45_000;
const PHASE_FOCUS_MS = 15_000;

const SURVEY_KEYS = ['a0', 'a1', 'a2', 'a3', 'a4'] as const;

export type VibeCheckFlowProps = {
  onCompleteDelta: (delta: number) => void;
  onSkip: () => void;
  showSkipButton?: boolean;
  /** アクションタブ内で「定期チェック」バッジを出す */
  showBadge?: boolean;
};

type FlowStep = 'color' | 'synapse' | 'focus' | 'survey';

const emptyMetrics = (): VibeCheckMetrics => ({
  colorSwerve: { correct: 0, total: 0, responseTimesMs: [], maxCombo: 0 },
  synapse: { roundsAttempted: 0, roundsCorrect: 0, maxSequenceLength: 3, responseTimesMs: [] },
  focus: { focusedMs: 0, totalMs: PHASE_FOCUS_MS, distractorHits: 0 },
  videoHoursIndex: 0,
});

export default function VibeCheckFlow({
  onCompleteDelta,
  onSkip,
  showSkipButton = true,
  showBadge = false,
}: VibeCheckFlowProps) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const [step, setStep] = useState<FlowStep>('color');
  const metrics = useRef<VibeCheckMetrics>(emptyMetrics());

  const stepIndex = step === 'color' ? 1 : step === 'synapse' ? 2 : step === 'focus' ? 3 : 4;
  const progress = stepIndex / 4;

  const goSurvey = useCallback(() => {
    setStep('survey');
    void haptics.medium();
  }, [haptics]);

  const onSurveyPick = useCallback(
    (idx: number) => {
      void haptics.light();
      metrics.current.videoHoursIndex = idx;
      const delta = calculateVibeCheckDelta(metrics.current);
      onCompleteDelta(delta);
    },
    [haptics, onCompleteDelta],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.skipBtn} />
        <View style={styles.headerCenter}>
          {showBadge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('brainRotTest.badge')}</Text>
            </View>
          ) : null}
        </View>
        {showSkipButton ? (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn} hitSlop={12}>
            <Text style={styles.skipText}>{t('brainRotTest.skipButton')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{t('brainRotTest.vibe.title')}</Text>
          <Text style={styles.progressCount}>
            {stepIndex}
            <Text style={styles.progressTotal}> / 4</Text>
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {step === 'color' ? (
        <ColorSwervePhase
          durationMs={PHASE_COLOR_MS}
          onDone={(s) => {
            metrics.current.colorSwerve = s;
            setStep('synapse');
          }}
        />
      ) : step === 'synapse' ? (
        <SynapseMatchPhase
          durationMs={PHASE_SYNAPSE_MS}
          onDone={(s) => {
            metrics.current.synapse = s;
            setStep('focus');
          }}
        />
      ) : step === 'focus' ? (
        <FocusShieldPhase
          durationMs={PHASE_FOCUS_MS}
          onDone={(s) => {
            metrics.current.focus = s;
            goSurvey();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.surveyScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.surveyQ}>{t('brainRotTest.vibe.survey.question')}</Text>
          {SURVEY_KEYS.map((key, idx) => (
            <TouchableOpacity
              key={key}
              style={styles.surveyCard}
              onPress={() => onSurveyPick(idx)}
              activeOpacity={0.78}
            >
              <View style={styles.surveyBadge}>
                <Text style={styles.surveyBadgeText}>{String(idx + 1)}</Text>
              </View>
              <Text style={styles.surveyAnswer}>{t(`brainRotTest.vibe.survey.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  skipBtn: { minWidth: 64, paddingVertical: 8 },
  skipText: { color: '#555', fontSize: 14, fontWeight: '600', textAlign: 'right' },
  badge: {
    backgroundColor: '#1e1433',
    borderWidth: 1,
    borderColor: '#a78bfa44',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '700' },
  progressContainer: { paddingHorizontal: 22, paddingBottom: 10 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: '700', color: '#777' },
  progressCount: { fontSize: 18, fontWeight: '800', color: '#a78bfa' },
  progressTotal: { fontSize: 13, color: '#555', fontWeight: '500' },
  progressBarBg: { height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 2 },
  surveyScroll: { paddingHorizontal: 22, paddingBottom: 32, gap: 12 },
  surveyQ: { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 30, marginBottom: 18 },
  surveyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 4,
  },
  surveyBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1e1433',
    borderWidth: 1,
    borderColor: '#a78bfa44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  surveyBadgeText: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },
  surveyAnswer: { color: '#e0e0e0', fontSize: 15, fontWeight: '500', flex: 1, lineHeight: 22 },
});
