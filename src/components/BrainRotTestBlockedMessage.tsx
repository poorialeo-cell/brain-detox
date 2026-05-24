import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import type { BrainRotTestBlockReason } from '../utils/brainRotTestLimits';
import { formatNextAllowedClock } from '../utils/brainRotTestLimits';

type Props = {
  reason: BrainRotTestBlockReason;
  nextAllowedAt?: number;
  onDismiss?: () => void;
  dismissLabel?: string;
};

export default function BrainRotTestBlockedMessage({
  reason,
  nextAllowedAt,
  onDismiss,
  dismissLabel,
}: Props) {
  const { t } = useI18n();
  const language = useAppStore((s) => s.language);

  const body =
    reason === 'dailyLimit'
      ? t('brainRotTest.limitDaily')
      : t('brainRotTest.limitCooldown', {
          time: nextAllowedAt != null ? formatNextAllowedClock(nextAllowedAt, language) : '—',
        });

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🧠</Text>
      <Text style={styles.title}>{t('brainRotTest.limitTitle')}</Text>
      <Text style={styles.body}>{body}</Text>
      {onDismiss ? (
        <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
          <Text style={styles.btnText}>{dismissLabel ?? t('brainRotTest.limitDismiss')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 14,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 18, fontWeight: '800', color: '#e8e8e8', textAlign: 'center' },
  body: { fontSize: 15, fontWeight: '600', color: '#888', textAlign: 'center', lineHeight: 24 },
  btn: {
    marginTop: 8,
    backgroundColor: '#2a2040',
    borderWidth: 1,
    borderColor: '#a78bfa55',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: '#c4b5fd' },
});
