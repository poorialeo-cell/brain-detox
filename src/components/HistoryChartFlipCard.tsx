import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import type { Language, ScoreEntry } from '../types';
import HistoryActivityCalendar from './HistoryActivityCalendar';
import HistoryDayDetailModal from './HistoryDayDetailModal';
import { useTheme } from '../hooks/useTheme';

type TFn = (key: string, options?: Record<string, string | number>) => string;

export type HistoryChartFlipCardProps = {
  t: TFn;
  language: Language;
  accentColor: string;
  haptics: { light: () => void };
  chartWidth: number;
  scoreHistory: ScoreEntry[];
  periodRow: React.ReactNode;
  chartNode: React.ReactNode;
};

export default function HistoryChartFlipCard({
  t,
  language,
  accentColor,
  haptics,
  chartWidth,
  scoreHistory,
  periodRow,
  chartNode,
}: HistoryChartFlipCardProps) {
  const theme = useTheme();
  const [showCalendar, setShowCalendar] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [dayDetail, setDayDetail] = useState<{ key: string; entries: ScoreEntry[] } | null>(null);

  const toggleFace = useCallback(() => {
    haptics.light();
    const next = !showCalendar;
    setShowCalendar(next);
    Animated.timing(flipAnim, {
      toValue: next ? 1 : 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showCalendar, haptics, flipAnim]);

  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.35, 0.65, 1], outputRange: [1, 0.4, 0, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.35, 0.65, 1], outputRange: [0, 0.4, 1, 1] });
  const chipsOpacity = flipAnim.interpolate({ inputRange: [0, 0.22, 1], outputRange: [1, 0, 0] });

  /** グラフ／カレンダーの実高に合わせカード内の余白を小さく */
  const flipStageMinH = showCalendar ? 328 : 332;

  return (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('history.chartLabel')}</Text>
        <TouchableOpacity
          onPress={toggleFace}
          style={[styles.flipBtn, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={showCalendar ? t('history.flipToChart') : t('history.flipToCalendar')}
          hitSlop={10}
        >
          <Text style={styles.flipBtnText}>{showCalendar ? '📈' : '📅'}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ opacity: chipsOpacity }}
        pointerEvents={showCalendar ? 'none' : 'auto'}
      >
        {periodRow}
      </Animated.View>

      <View style={[styles.flipStage, { minHeight: flipStageMinH }]}>
        <Animated.View
          pointerEvents={showCalendar ? 'none' : 'box-none'}
          style={[
            styles.face,
            styles.faceChart,
            {
              opacity: frontOpacity,
            },
          ]}
        >
          {chartNode}
        </Animated.View>
        <Animated.View
          pointerEvents={showCalendar ? 'box-none' : 'none'}
          style={[
            styles.face,
            styles.faceCalendar,
            {
              opacity: backOpacity,
            },
          ]}
        >
          <HistoryActivityCalendar
            width={chartWidth}
            scoreHistory={scoreHistory}
            language={language}
            onDayPress={(key, entries) => {
              haptics.light();
              setDayDetail({ key, entries });
            }}
          />
        </Animated.View>
      </View>

      <HistoryDayDetailModal
        visible={!!dayDetail}
        dayKey={dayDetail?.key ?? null}
        entries={dayDetail?.entries ?? []}
        language={language}
        accentColor={accentColor}
        t={t}
        onClose={() => setDayDetail(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  flipBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtnText: { fontSize: 18 },
  flipStage: {
    marginTop: 2,
    position: 'relative',
    width: '100%',
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
  },
  faceChart: {
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  faceCalendar: {
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
});
