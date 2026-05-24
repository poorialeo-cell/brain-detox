import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { PartnerType, ScoreEntry, Badge, Language } from '../types';
import BadgeDetailModal from '../components/BadgeDetailModal';
import HomeStatHintOverlay, { type HomeStatHintAnchor } from '../components/HomeStatHintOverlay';
import { useHaptics } from '../hooks/useHaptics';
import {
  buildHistoryChartEntries,
  thinChartLabels,
  type HistoryChartPeriod,
} from '../utils/historyChartSeries';
import {
  DAY_MS,
  startOfLocalDayMs,
  formatLocalCalendarMd,
  formatWeekdayShort,
  normalizeTimestampMs,
  isBrainRotTestEntry,
} from '../utils/calendarFormat';
import HistoryChartFlipCard from '../components/HistoryChartFlipCard';
import { useTheme } from '../hooks/useTheme';

const PARTNER_COLOR: Record<PartnerType, string> = {
  teacher:   '#f87171',
  counselor: '#f9a8d4',
  scientist: '#67e8f9',
  trainer:   '#fbbf24',
};

function formatDateLabel(timestamp: number, t: (k: string, o?: Record<string, string | number>) => string): string {
  const now = new Date();
  const startToday = startOfLocalDayMs(now.getTime());
  const startThen = startOfLocalDayMs(timestamp);
  const diffDays = Math.round((startToday - startThen) / DAY_MS);
  if (diffDays === 0) return t('history.today');
  if (diffDays === 1) return t('history.yesterday');
  return formatLocalCalendarMd(timestamp);
}

function formatChartAxisLabel(
  ts: number,
  period: HistoryChartPeriod,
  t: (k: string, o?: Record<string, string | number>) => string,
  language: Language,
  monthIndex?: number,
  monthSeries?: ScoreEntry[],
): string {
  if (period === 'day') {
    return formatDateLabel(ts, t);
  }
  if (period === 'week') {
    return formatWeekdayShort(ts, language);
  }
  if (period === 'month') {
    const md = formatLocalCalendarMd(ts);
    if (monthIndex !== undefined && monthIndex > 0 && monthSeries) {
      const d = new Date(ts);
      const prevD = new Date(monthSeries[monthIndex - 1].timestamp);
      if (d.getFullYear() !== prevD.getFullYear() && d.getMonth() === 0) {
        return `${md}/${d.getFullYear()}`;
      }
    }
    return md;
  }
  return formatLocalCalendarMd(ts);
}

const CHART_PERIOD_OPTIONS: { key: HistoryChartPeriod; labelKey: string }[] = [
  { key: 'day', labelKey: 'history.chartRangeDay' },
  { key: 'week', labelKey: 'history.chartRangeWeek' },
  { key: 'month', labelKey: 'history.chartRangeMonth' },
  { key: 'all', labelKey: 'history.chartRangeAll' },
];

function getScoreColor(score: number): string {
  if (score >= 71) return '#4ade80';
  if (score >= 41) return '#a78bfa';
  if (score >= 21) return '#fbbf24';
  return '#f87171';
}

/** 実データの上下に余白を付けた Y 軸レンジ（0〜100 にクリップ）。react-native-chart-kit 用にパディング幅はスパンの 1/2。 */
function getPaddedScoreAxisRange(scores: number[]): { yMin: number; yMax: number } {
  const valid = scores.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return { yMin: 0, yMax: 100 };
  const dataMin = Math.min(...valid);
  const dataMax = Math.max(...valid);
  const span = dataMax - dataMin;
  const pad = span > 0 ? span / 2 : 10;
  let yMin = dataMin - pad;
  let yMax = dataMax + pad;
  yMin = Math.max(0, yMin);
  yMax = Math.min(100, yMax);
  if (yMax <= yMin) {
    yMax = Math.min(100, yMin + 1);
  }
  if (yMax <= yMin) {
    yMin = Math.max(0, yMax - 1);
  }
  return { yMin, yMax };
}

// ── バッジカード ─────────────────────────────────────────────────────
function BadgeCard({ badge, t, onPress }: { badge: Badge; t: (k: string) => string; onPress: () => void }) {
  const theme = useTheme();
  const earned = !!badge.earnedAt;
  const dateStr = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString()
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.badgeCard,
        { backgroundColor: theme.colors.card, borderColor: earned ? badge.color + '55' : theme.colors.border },
        !earned && styles.badgeCardLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>{badge.emoji}</Text>
      <Text style={[styles.badgeName, earned ? { color: badge.color } : { color: theme.colors.textSubtle }]} numberOfLines={1}>
        {t(badge.nameKey)}
      </Text>
      <Text style={[styles.badgeDate, { color: theme.colors.textSubtle }]} numberOfLines={1}>
        {earned && dateStr ? t('badges.earnedOn').replace('{{date}}', dateStr) : t('badges.locked')}
      </Text>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const haptics = useHaptics();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { scoreHistory: scoreHistoryRaw, selectedPartner, badges, language } = useAppStore();
  const scoreHistory = useMemo(
    () => scoreHistoryRaw.map((e) => ({ ...e, timestamp: normalizeTimestampMs(e.timestamp) })),
    [scoreHistoryRaw],
  );

  const [chartPeriod, setChartPeriod] = useState<HistoryChartPeriod>('day');
  const [activeTab, setActiveTab] = useState<'history' | 'badges'>('history');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [scoreDotHint, setScoreDotHint] = useState<{ anchor: HomeStatHintAnchor; text: string } | null>(null);
  const dismissScoreDotHint = useCallback(() => setScoreDotHint(null), []);
  const openScoreDotHint = useCallback(
    (anchor: HomeStatHintAnchor) => {
      haptics.light();
      setScoreDotHint({ anchor, text: t('history.hintScoreDot') });
    },
    [haptics, t],
  );
  const tabAnim = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const switchTab = useCallback(
    (tab: 'history' | 'badges') => {
      const index = tab === 'history' ? 0 : 1;
      setActiveTab(tab);
      pagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
      Animated.timing(tabAnim, {
        toValue: index,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [windowWidth, tabAnim],
  );

  const onPagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.min(1, Math.max(0, Math.round(x / windowWidth)));
      const tab = page === 0 ? 'history' : 'badges';
      setActiveTab(tab);
      Animated.timing(tabAnim, {
        toValue: page,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [windowWidth, tabAnim],
  );

  useEffect(() => {
    const idx = activeTabRef.current === 'history' ? 0 : 1;
    pagerRef.current?.scrollTo({ x: idx * windowWidth, animated: false });
  }, [windowWidth]);

  const partner = selectedPartner ?? 'counselor';
  const accentColor = PARTNER_COLOR[partner];

  const chartData = useMemo(() => {
    const entries = buildHistoryChartEntries(scoreHistory, chartPeriod);
    if (!entries || entries.length < 2) return null;

    const rawLabels = entries.map((e, i) =>
      formatChartAxisLabel(e.timestamp, chartPeriod, t, language, i, entries),
    );
    const labels = thinChartLabels(rawLabels);
    const scores = entries.map((e) => e.score);
    return {
      labels,
      scores,
      ...getPaddedScoreAxisRange(scores),
    };
  }, [scoreHistory, chartPeriod, t, language]);

  // 統計データ
  const stats = useMemo(() => {
    if (scoreHistory.length === 0) return null;
    const scores = scoreHistory.map((e) => e.score);
    const recent7 = scores.slice(0, 7);
    return {
      highest: Math.max(...scores),
      average: Math.round(recent7.reduce((a, b) => a + b, 0) / recent7.length),
      actionsCount: scoreHistory.filter((e) => e.kind !== 'brainRotTest').length,
    };
  }, [scoreHistory]);

  // 最近の記録（最新10件）
  const recentEntries = useMemo(
    () => [...scoreHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    [scoreHistory],
  );

  const TAB_WIDTH = (windowWidth - 44) / 2;
  const underlineX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, TAB_WIDTH] });

  /** scroll paddingHorizontal 22×2 + chartCard padding 12×2 */
  const chartWidth = Math.max(200, windowWidth - 44 - 24);

  const chartPeriodRowEl = useMemo(
    () => (
      <View style={styles.chartPeriodRow}>
        {CHART_PERIOD_OPTIONS.map(({ key, labelKey }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.chartPeriodChip,
              { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border },
              chartPeriod === key && styles.chartPeriodChipActive,
              chartPeriod === key && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
            ]}
            onPress={() => {
              haptics.light();
              setChartPeriod(key);
            }}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chartPeriodChipText,
                { color: theme.colors.textSubtle },
                chartPeriod === key && styles.chartPeriodChipTextActive,
                chartPeriod === key && { color: theme.colors.accentText },
              ]}
              numberOfLines={1}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    [chartPeriod, haptics, t, theme.colors.cardAlt, theme.colors.border, theme.colors.accent, theme.colors.accentSoft, theme.colors.textSubtle, theme.colors.accentText],
  );

  const chartFaceEl = useMemo(() => {
    if (!chartData) {
      return (
        <View style={[styles.chartClip, styles.chartPlaceholder]}>
          <Text style={[styles.chartPlaceholderText, { color: theme.colors.textSubtle }]}>{t('history.chartNeedsMore')}</Text>
        </View>
      );
    }
    return (
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
              {
                data: Array.from({ length: chartData.scores.length }, () => chartData.yMin),
                withDots: false,
                strokeWidth: 0.001,
                color: () => 'rgba(0,0,0,0)',
              },
              {
                data: Array.from({ length: chartData.scores.length }, () => chartData.yMax),
                withDots: false,
                strokeWidth: 0.001,
                color: () => 'rgba(0,0,0,0)',
              },
            ],
          }}
          width={chartWidth}
          height={292}
          yLabelsOffset={10}
          chartConfig={{
            backgroundColor: theme.colors.card,
            backgroundGradientFrom: theme.colors.card,
            backgroundGradientTo: theme.colors.card,
            decimalPlaces: 0,
            color: () => accentColor,
            labelColor: () => theme.colors.textSubtle,
            propsForVerticalLabels: { fontSize: 10 },
            propsForHorizontalLabels: { fontSize: 10 },
            propsForDots: { r: '5', strokeWidth: '2', stroke: accentColor },
            propsForBackgroundLines: { stroke: theme.colors.border },
          }}
          bezier
          withVerticalLines={false}
          withShadow={false}
          style={{
            borderRadius: 8,
            /* 上が空きすぎると曲線・ドット上端が欠ける（既定16に近い値） */
            paddingTop: 14,
            paddingBottom: 8,
            /* chart-kit: style.paddingRight が Y 軸ガター兼 View の右パディング。大きいとプロットが右寄りに見える */
            paddingRight: 44,
            margin: 0,
            marginRight: 0,
          }}
        />
      </View>
    );
  }, [chartData, chartWidth, accentColor, t, theme.colors.card, theme.colors.textSubtle, theme.colors.border]);

  const pageMinHeight = Math.max(320, windowHeight * 0.55);

  const historyScrollContent =
    scoreHistory.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSubtle }]}>{t('history.noData')}</Text>
      </View>
    ) : (
      <>
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label={t('history.statsHighest')} value={stats.highest} unit="pt" color={accentColor} />
            <StatCard label={t('history.statsAverage')} value={stats.average} unit="pt" color={theme.colors.accent} />
            <StatCard label={t('history.statsActions')} value={stats.actionsCount} unit={t('nav.action')} color="#4ade80" />
          </View>
        )}

        <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <HistoryChartFlipCard
            t={t}
            language={language}
            accentColor={accentColor}
            haptics={haptics}
            chartWidth={chartWidth}
            scoreHistory={scoreHistory}
            periodRow={chartPeriodRowEl}
            chartNode={chartFaceEl}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('history.recentLabel')}</Text>
        <View style={[styles.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {recentEntries.map((entry, idx) => (
            <View key={`${entry.timestamp}-${idx}`}>
              <HistoryRow
                entry={entry}
                olderEntry={recentEntries[idx + 1]}
                t={t}
                onScoreDotPress={openScoreDotHint}
              />
              {idx < recentEntries.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
            </View>
          ))}
        </View>
      </>
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.appBg }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.colors.appBg} />

      <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{t('history.title')}</Text>

      <View style={[styles.tabBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => switchTab('history')} activeOpacity={0.7}>
          <Text style={[styles.tabLabel, { color: theme.colors.textSubtle }, activeTab === 'history' && styles.tabLabelActive, activeTab === 'history' && { color: theme.colors.accentText }]}>
            {t('badges.tabHistory')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => switchTab('badges')} activeOpacity={0.7}>
          <Text style={[styles.tabLabel, { color: theme.colors.textSubtle }, activeTab === 'badges' && styles.tabLabelActive, activeTab === 'badges' && { color: theme.colors.accentText }]}>
            {t('badges.tabBadges')}
          </Text>
        </TouchableOpacity>
        <Animated.View style={[styles.tabUnderline, { backgroundColor: theme.colors.accent, transform: [{ translateX: underlineX }], width: TAB_WIDTH }]} />
      </View>

      <View style={styles.pagerWrap}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onPagerMomentumEnd}
          decelerationRate="fast"
          style={styles.pager}
        >
          <View style={[styles.pagerPage, { width: windowWidth, minHeight: pageMinHeight }]}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scroll}
              style={styles.pagerInnerScroll}
            >
              {historyScrollContent}
            </ScrollView>
          </View>

          <View style={[styles.pagerPage, { width: windowWidth, minHeight: pageMinHeight }]}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scroll}
              style={styles.pagerInnerScroll}
            >
              <View style={styles.badgeGrid}>
                {badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} t={t} onPress={() => setSelectedBadge(badge)} />
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />

      <HomeStatHintOverlay
        visible={!!scoreDotHint}
        text={scoreDotHint?.text ?? ''}
        anchor={scoreDotHint?.anchor ?? null}
        onDismiss={dismissScoreDotHint}
      />
    </SafeAreaView>
  );
}

// ── 統計カード ────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statCard, { borderColor: color + '44', backgroundColor: theme.colors.card }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statUnit, { color: theme.colors.textSubtle }]}>{unit}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSubtle }]}>{label}</Text>
    </View>
  );
}

function resolveGain(entry: ScoreEntry, olderEntry: ScoreEntry | undefined): number | null {
  if (typeof entry.scoreGain === 'number' && Number.isFinite(entry.scoreGain)) {
    return entry.scoreGain;
  }
  if (!olderEntry) return null;
  const delta = entry.score - olderEntry.score;
  return Number.isFinite(delta) ? delta : null;
}

// ── 履歴行 ────────────────────────────────────────────────────────────
function HistoryRow({
  entry,
  olderEntry,
  t,
  onScoreDotPress,
}: {
  entry: ScoreEntry;
  olderEntry: ScoreEntry | undefined;
  t: (k: string) => string;
  onScoreDotPress: (anchor: HomeStatHintAnchor) => void;
}) {
  const theme = useTheme();
  const dotRef = useRef<View>(null);
  const scoreColor = getScoreColor(entry.score);
  const date = new Date(entry.timestamp);
  const timeStr = `${formatLocalCalendarMd(entry.timestamp)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const isTest = isBrainRotTestEntry(entry);
  const gain =
    isTest
      ? typeof entry.testDelta === 'number' && Number.isFinite(entry.testDelta)
        ? entry.testDelta
        : resolveGain(entry, olderEntry)
      : resolveGain(entry, olderEntry);
  const gainColor =
    gain === null ? theme.colors.textSubtle : gain > 0 ? '#4ade80' : gain < 0 ? '#f87171' : theme.colors.textSubtle;
  const gainText = gain !== null ? `${gain > 0 ? '+' : ''}${gain}pt` : '—';

  const handleDotPress = useCallback(() => {
    dotRef.current?.measureInWindow((x, y, width, height) => {
      onScoreDotPress({ x, y, w: width, h: height });
    });
  }, [onScoreDotPress]);

  return (
    <View style={styles.historyRow}>
      <Pressable onPress={handleDotPress} hitSlop={12} style={styles.scoreDotHit} accessibilityRole="button">
        <View ref={dotRef} collapsable={false} style={[styles.scoreDot, { backgroundColor: scoreColor }]} />
      </Pressable>
      <View style={styles.historyInfo}>
        <Text style={[styles.historyAction, { color: theme.colors.text }]} numberOfLines={1}>
          {isTest ? t('history.rowBrainRotTest') : (entry.actionTitle ?? '—')}
        </Text>
        <Text style={[styles.historyTime, { color: theme.colors.textSubtle }]}>{timeStr}</Text>
      </View>
      <View style={styles.historyScoreCol}>
        <Text style={[styles.historyMetricLabel, { color: theme.colors.textSubtle }]}>{t('history.gainedLabel')}</Text>
        <Text style={[styles.historyGain, { color: gainColor }]}>{gainText}</Text>
        <Text style={[styles.historyMetricLabel, styles.historyMetricLabelSpaced, { color: theme.colors.textSubtle }]}>{t('history.labelTotalScore')}</Text>
        <Text style={[styles.historyTotalAfter, { color: scoreColor }]}>{entry.score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: 22, paddingBottom: 110 },
  pagerWrap: { flex: 1 },
  pager: { flex: 1 },
  pagerPage: { flex: 1 },
  pagerInnerScroll: { flex: 1 },

  pageTitle: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    paddingTop: 16, marginBottom: 12, paddingHorizontal: 22,
  },

  /* 内部タブバー */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginBottom: 20,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    position: 'relative',
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13, fontWeight: '700', color: '#555',
  },
  tabLabelActive: {
    color: '#a78bfa',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0, height: 2,
    backgroundColor: '#a78bfa',
    borderRadius: 1,
  },

  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  badgeCard: {
    width: '30%', backgroundColor: '#161616',
    borderWidth: 1, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4,
  },
  badgeCardLocked: { borderColor: '#2a2a2a' },
  badgeEmoji: { fontSize: 28 },
  badgeEmojiLocked: { opacity: 0.25 },
  badgeName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  badgeTextLocked: { color: '#444' },
  badgeDate: { fontSize: 9, color: '#444', textAlign: 'center' },

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
    borderRadius: 16, padding: 12, marginBottom: 24,
  },
  chartClip: {
    overflow: 'hidden',
    borderRadius: 8,
    marginTop: 0,
    width: '100%',
    alignSelf: 'stretch',
  },

  chartPlaceholder: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  chartPeriodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  chartPeriodChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  chartPeriodChipActive: {
    borderColor: '#a78bfa',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
  },
  chartPeriodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  chartPeriodChipTextActive: {
    color: '#c4b5fd',
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
  scoreDotHit: { justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  scoreDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  historyInfo: { flex: 1 },
  historyAction: { fontSize: 14, fontWeight: '600', color: '#e0e0e0', marginBottom: 2 },
  historyTime: { fontSize: 12, color: '#555' },
  historyScoreCol: { alignItems: 'flex-end', minWidth: 88 },
  historyMetricLabel: {
    fontSize: 10, fontWeight: '700', color: '#555',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  historyMetricLabelSpaced: { marginTop: 8 },
  historyGain: { fontSize: 17, fontWeight: '900' },
  historyTotalAfter: { fontSize: 15, fontWeight: '800' },
});
