import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { PartnerType, ScoreEntry } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const PARTNER_COLOR: Record<PartnerType, string> = {
  teacher:   '#f87171',
  counselor: '#f9a8d4',
  scientist: '#67e8f9',
  trainer:   '#fbbf24',
};

function formatDateLabel(timestamp: number, t: (k: string) => string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('history.today');
  if (diffDays === 1) return t('history.yesterday');
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getScoreColor(score: number): string {
  if (score >= 71) return '#4ade80';
  if (score >= 41) return '#a78bfa';
  if (score >= 21) return '#fbbf24';
  return '#f87171';
}

export default function HistoryScreen() {
  const { t } = useI18n();
  const { scoreHistory, selectedPartner, brainScore } = useAppStore();

  const partner = selectedPartner ?? 'counselor';
  const accentColor = PARTNER_COLOR[partner];

  // グラフ用データ（最新14件を時系列順に）
  const chartData = useMemo(() => {
    const sorted = [...scoreHistory]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-14);

    if (sorted.length < 2) return null;

    return {
      labels: sorted.map((e) => formatDateLabel(e.timestamp, t)),
      scores: sorted.map((e) => e.score),
    };
  }, [scoreHistory, t]);

  // 統計データ
  const stats = useMemo(() => {
    if (scoreHistory.length === 0) return null;
    const scores = scoreHistory.map((e) => e.score);
    const recent7 = scores.slice(0, 7);
    return {
      highest: Math.max(...scores),
      average: Math.round(recent7.reduce((a, b) => a + b, 0) / recent7.length),
      actionsCount: scoreHistory.filter((e) => e.actionTitle).length,
    };
  }, [scoreHistory]);

  // 最近の記録（最新10件）
  const recentEntries = useMemo(
    () => [...scoreHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    [scoreHistory]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <Text style={styles.pageTitle}>{t('history.title')}</Text>

        {scoreHistory.length === 0 ? (
          /* データなし */
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>{t('history.noData')}</Text>
          </View>
        ) : (
          <>
            {/* 統計カード */}
            {stats && (
              <View style={styles.statsRow}>
                <StatCard label={t('history.statsHighest')} value={stats.highest} unit="pt" color={accentColor} />
                <StatCard label={t('history.statsAverage')} value={stats.average} unit="pt" color="#a78bfa" />
                <StatCard label={t('history.statsActions')} value={stats.actionsCount} unit={t('nav.action')} color="#4ade80" />
              </View>
            )}

            {/* 折れ線グラフ */}
            {chartData && (
              <View style={styles.chartCard}>
                <Text style={styles.sectionLabel}>{t('history.chartLabel')}</Text>
                {/* overflow:hidden でチャートのはみ出しをクリップ */}
                <View style={styles.chartClip}>
                  <LineChart
                    data={{
                      labels: chartData.labels,
                      datasets: [
                        {
                          data: chartData.scores,
                          color: () => accentColor,
                          strokeWidth: 2,
                        },
                      ],
                    }}
                    width={SCREEN_WIDTH - 80}
                    height={200}
                    chartConfig={{
                      backgroundColor: '#161616',
                      backgroundGradientFrom: '#161616',
                      backgroundGradientTo: '#161616',
                      decimalPlaces: 0,
                      color: () => accentColor,
                      labelColor: () => '#555',
                      propsForDots: { r: '5', strokeWidth: '2', stroke: accentColor },
                      propsForBackgroundLines: { stroke: '#2a2a2a' },
                    }}
                    bezier
                    withVerticalLines={false}
                    style={{ borderRadius: 8 }}
                  />
                </View>
              </View>
            )}

            {/* 最近の記録リスト */}
            <Text style={styles.sectionLabel}>{t('history.recentLabel')}</Text>
            <View style={styles.listCard}>
              {recentEntries.map((entry, idx) => (
                <View key={`${entry.timestamp}-${idx}`}>
                  <HistoryRow entry={entry} t={t} />
                  {idx < recentEntries.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 統計カード ────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── 履歴行 ────────────────────────────────────────────────────────────
function HistoryRow({ entry, t }: { entry: ScoreEntry; t: (k: string) => string }) {
  const scoreColor = getScoreColor(entry.score);
  const date = new Date(entry.timestamp);
  const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <View style={styles.historyRow}>
      <View style={[styles.scoreDot, { backgroundColor: scoreColor }]} />
      <View style={styles.historyInfo}>
        <Text style={styles.historyAction} numberOfLines={1}>
          {entry.actionTitle ?? '—'}
        </Text>
        <Text style={styles.historyTime}>{timeStr}</Text>
      </View>
      <Text style={[styles.historyScore, { color: scoreColor }]}>{entry.score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: 22, paddingBottom: 110 },

  pageTitle: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    paddingTop: 16, marginBottom: 24,
  },

  emptyContainer: {
    alignItems: 'center', paddingTop: 80, gap: 16,
  },
  emptyEmoji: { fontSize: 56 },
  emptyText: {
    fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 24,
  },

  /* 統計 */
  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  statCard: {
    flex: 1, backgroundColor: '#161616', borderWidth: 1,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: 26, fontWeight: '900' },
  statUnit: { fontSize: 11, color: '#555', fontWeight: '600' },
  statLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center' },

  /* グラフ */
  chartCard: {
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 16, padding: 16, marginBottom: 24,
  },
  chartClip: {
    overflow: 'hidden',
    borderRadius: 8,
    marginTop: 8,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#555',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },

  /* リスト */
  listCard: {
    backgroundColor: '#161616', borderWidth: 1,
    borderColor: '#2a2a2a', borderRadius: 16, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#222', marginHorizontal: 16 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  scoreDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  historyInfo: { flex: 1 },
  historyAction: { fontSize: 14, fontWeight: '600', color: '#e0e0e0', marginBottom: 2 },
  historyTime: { fontSize: 12, color: '#555' },
  historyScore: { fontSize: 22, fontWeight: '900' },
});
