import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import type { Language, ScoreEntry } from '../types';
import { formatLocalDayLongFromKey, isBrainRotTestEntry, formatLocalCalendarMd } from '../utils/calendarFormat';
import { useTheme } from '../hooks/useTheme';

type TFn = (k: string, params?: Record<string, string | number>) => string;

function testSummary(delta: number, t: TFn): string {
  if (delta > 0) return t('brainRotTest.resultPositive');
  if (delta === 0) return t('brainRotTest.resultNeutral');
  return t('brainRotTest.resultNegative');
}

export type HistoryDayDetailModalProps = {
  visible: boolean;
  dayKey: string | null;
  entries: ScoreEntry[];
  language: Language;
  accentColor: string;
  t: TFn;
  onClose: () => void;
};

export default function HistoryDayDetailModal({
  visible,
  dayKey,
  entries,
  language,
  accentColor,
  t,
  onClose,
}: HistoryDayDetailModalProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  if (!visible) return null;
  if (!dayKey) return null;

  const title = formatLocalDayLongFromKey(dayKey, language);
  /** シート高の大部分を一覧に割り当て、長い日でもスクロールで閲覧可能にする */
  const scrollMaxHeight = Math.min(480, Math.floor(windowHeight * 0.56));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('badges.close')}
        />
        <View style={[styles.sheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} accessibilityViewIsModal>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.textSubtle }]}>{t('history.dayDetailTitle')}</Text>
            <Text style={[styles.sheetDate, { color: accentColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
              <Text style={[styles.closeBtnText, { color: theme.colors.accentText }]}>{t('badges.close')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            bounces
          >
            {entries.map((entry, idx) => {
              const isTest = isBrainRotTestEntry(entry);
              const delta =
                typeof entry.testDelta === 'number' && Number.isFinite(entry.testDelta) ? entry.testDelta : null;
              const gain =
                typeof entry.scoreGain === 'number' && Number.isFinite(entry.scoreGain) ? entry.scoreGain : null;
              const time = new Date(entry.timestamp);
              const timeStr = `${formatLocalCalendarMd(entry.timestamp)} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

              return (
                <View
                  key={`${entry.timestamp}-${idx}`}
                  style={[styles.entryCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.entryKind, { color: theme.colors.textSubtle }]}>
                    {isTest ? t('history.entryKindTest') : t('history.entryKindAction')}
                  </Text>
                  {!isTest && (
                    <Text style={[styles.entryTitle, { color: theme.colors.text }]} numberOfLines={3}>
                      {entry.actionTitle ?? '—'}
                    </Text>
                  )}
                  {isTest && delta !== null && (
                    <>
                      <Text style={[styles.entryMeta, { color: theme.colors.textMuted }]}>{testSummary(delta, t)}</Text>
                      <Text style={[styles.entryDelta, { color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#888' }]}>
                        {delta > 0 ? '+' : ''}
                        {delta}pt
                      </Text>
                    </>
                  )}
                  {!isTest && gain !== null && (
                    <Text style={[styles.entryMeta, { color: gain > 0 ? '#4ade80' : gain < 0 ? '#f87171' : theme.colors.textSubtle }]}>
                      {t('history.entryGain', { n: `${gain > 0 ? '+' : ''}${gain}pt` })}
                    </Text>
                  )}
                  {!isTest && typeof entry.xpGained === 'number' && entry.xpGained > 0 && (
                    <Text style={[styles.entryMeta, { color: theme.colors.textMuted }]}>{t('history.entryXp', { xp: entry.xpGained })}</Text>
                  )}
                  <Text style={[styles.entryTime, { color: theme.colors.textSubtle }]}>{timeStr}</Text>
                  <Text style={[styles.entryScoreLabel, { color: theme.colors.textSubtle }]}>{t('history.entryScoreAfter')}</Text>
                  <Text style={[styles.entryScore, { color: accentColor }]}>{entry.score}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#161616',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    width: '100%',
    maxHeight: '82%',
    overflow: 'hidden',
  },
  sheetHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 6,
  },
  sheetTitle: { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 1.2, textTransform: 'uppercase' },
  sheetDate: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeBtn: { position: 'absolute', right: 14, top: 14, paddingVertical: 6, paddingHorizontal: 10 },
  closeBtnText: { fontSize: 13, fontWeight: '700', color: '#a78bfa' },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 14, gap: 12, paddingBottom: 24 },
  entryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    gap: 4,
  },
  entryKind: { fontSize: 10, fontWeight: '800', color: '#666', letterSpacing: 1, textTransform: 'uppercase' },
  entryTitle: { fontSize: 15, fontWeight: '700', color: '#e8e8e8', marginTop: 4 },
  entryMeta: { fontSize: 14, fontWeight: '600', color: '#aaa', marginTop: 4 },
  entryDelta: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  entryTime: { fontSize: 12, color: '#555', marginTop: 8 },
  entryScoreLabel: { fontSize: 10, fontWeight: '700', color: '#555', marginTop: 6, textTransform: 'uppercase' },
  entryScore: { fontSize: 22, fontWeight: '900' },
});
