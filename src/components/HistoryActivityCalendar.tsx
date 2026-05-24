import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Language, ScoreEntry } from '../types';
import { localDayKey, isBrainRotTestEntry, DAY_MS } from '../utils/calendarFormat';
import { useTheme } from '../hooks/useTheme';

const MARK_ACTION = '#4ade80';
const MARK_TEST = '#67e8f9';

function weekdayStrip(language: Language): string[] {
  const sun = new Date(2024, 5, 2);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun.getTime() + i * DAY_MS);
    try {
      return new Intl.DateTimeFormat(
        language === 'ja' ? 'ja-JP' : language === 'th' ? 'th-TH' : 'en-US',
        { weekday: 'narrow' },
      ).format(d);
    } catch {
      return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i] ?? '';
    }
  });
}

export type HistoryActivityCalendarProps = {
  width: number;
  scoreHistory: ScoreEntry[];
  language: Language;
  onDayPress: (dayKey: string, entries: ScoreEntry[]) => void;
};

export default function HistoryActivityCalendar({
  width,
  scoreHistory,
  language,
  onDayPress,
}: HistoryActivityCalendarProps) {
  const theme = useTheme();
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const dayGroups = useMemo(() => {
    const m = new Map<string, ScoreEntry[]>();
    for (const e of scoreHistory) {
      const k = localDayKey(e.timestamp);
      if (!k) continue;
      const arr = m.get(k);
      if (arr) arr.push(e);
      else m.set(k, [e]);
    }
    return m;
  }, [scoreHistory]);

  const headers = useMemo(() => weekdayStrip(language), [language]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = localDayKey(today.getTime());

  const colW = Math.max(28, (width - 4) / 7);
  /** 固定行高で 6 行月でもカード内に収まるようにする */
  const ROW_H = 40;

  const goPrev = useCallback(() => {
    setViewMonth(new Date(year, month - 1, 1));
  }, [year, month]);

  const goNext = useCallback(() => {
    setViewMonth(new Date(year, month + 1, 1));
  }, [year, month]);

  const title = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(
        language === 'ja' ? 'ja-JP' : language === 'th' ? 'th-TH' : 'en-US',
        { year: 'numeric', month: 'long' },
      ).format(new Date(year, month, 1));
    } catch {
      return `${year}/${month + 1}`;
    }
  }, [year, month, language]);

  const cells: { day: number; key: string; entries: ScoreEntry[] }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const key = localDayKey(dt.getTime());
    cells.push({ day: d, key, entries: dayGroups.get(key) ?? [] });
  }

  const leading = firstDow;

  return (
    <View style={[styles.wrap, { width, maxWidth: width }]}>
      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={goPrev}
          hitSlop={12}
          style={[styles.monthNav, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.monthNavText, { color: theme.colors.accentText }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={goNext}
          hitSlop={12}
          style={[styles.monthNav, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.monthNavText, { color: theme.colors.accentText }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {headers.map((h, i) => (
          <View key={i} style={[styles.weekCell, { width: colW }]}>
            <Text style={[styles.weekHead, { color: theme.colors.textSubtle }]}>{h}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: leading }, (_, i) => (
          <View key={`p-${i}`} style={[styles.cell, { width: colW, height: ROW_H }]} />
        ))}
        {cells.map(({ day, key, entries }) => {
          const hasAction = entries.some((e) => !isBrainRotTestEntry(e));
          const hasTest = entries.some((e) => isBrainRotTestEntry(e));
          const isToday = key === todayKey;
          const active = entries.length > 0;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.cell,
                { width: colW, height: ROW_H },
                isToday && styles.cellToday,
                isToday && { borderColor: `${theme.colors.accent}66` },
                active && styles.cellActive,
                active && { backgroundColor: theme.colors.accentSoft },
              ]}
              onPress={() => active && onDayPress(key, [...entries].sort((a, b) => b.timestamp - a.timestamp))}
              disabled={!active}
              activeOpacity={active ? 0.7 : 1}
              accessibilityRole="button"
              accessibilityState={{ disabled: !active }}
            >
              <Text
                style={[
                  styles.dayNum,
                  { color: active ? theme.colors.text : theme.colors.textSubtle },
                  !active && styles.dayNumMuted,
                ]}
              >
                {day}
              </Text>
              <View style={styles.marks}>
                {hasAction ? <View style={[styles.dot, { backgroundColor: MARK_ACTION }]} /> : null}
                {hasTest ? <View style={[styles.dot, { backgroundColor: MARK_TEST }]} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  monthNav: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: { fontSize: 20, fontWeight: '700' },
  monthTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekCell: { alignItems: 'center' },
  weekHead: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 0,
  },
  cellToday: { borderWidth: 1 },
  cellActive: {},
  dayNum: { fontSize: 13, fontWeight: '700' },
  dayNumMuted: { opacity: 0.65 },
  marks: { flexDirection: 'row', gap: 3, marginTop: 1, minHeight: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
