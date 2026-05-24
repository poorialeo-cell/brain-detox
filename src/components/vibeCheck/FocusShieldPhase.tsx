import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { useHaptics } from '../../hooks/useHaptics';

const { width: SW, height: SH } = Dimensions.get('window');

export type FocusStats = {
  focusedMs: number;
  totalMs: number;
  distractorHits: number;
};

type Props = {
  durationMs: number;
  onDone: (stats: FocusStats) => void;
};

const DIST_KEYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'] as const;

type Floater = {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  label: string;
  kind: 'notif' | 'meme';
};

let floatId = 0;

/** 中央プレス継続＋通知風フロート妨害 */
export default function FocusShieldPhase({ durationMs, onDone }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const endAt = useRef(Date.now() + durationMs).current;
  const finished = useRef(false);
  const [remainMs, setRemainMs] = useState(durationMs);
  const pressing = useRef(false);
  const focusedMs = useRef(0);
  const hits = useRef(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const spawn = useCallback(() => {
    const key = DIST_KEYS[Math.floor(Math.random() * DIST_KEYS.length)]!;
    const label = t(`brainRotTest.vibe.distractors.${key}`);
    const kind: 'notif' | 'meme' = key === 'd3' || key === 'd4' || key === 'd5' ? 'meme' : 'notif';
    const id = `f-${floatId++}`;
    const startX = Math.random() < 0.5 ? -160 : SW + 40;
    const startY = 80 + Math.random() * (SH * 0.45);
    const endX = startX < 0 ? SW + 120 : -180;
    const endY = startY + (Math.random() - 0.5) * 120;
    const x = new Animated.Value(startX);
    const y = new Animated.Value(startY);
    const f: Floater = { id, x, y, label, kind };
    setFloaters((prev) => [...prev.slice(-10), f]);
    Animated.parallel([
      Animated.timing(x, {
        toValue: endX,
        duration: 3200 + Math.random() * 900,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: endY,
        duration: 3200 + Math.random() * 900,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFloaters((prev) => prev.filter((p) => p.id !== id));
    });
  }, [t]);

  useEffect(() => {
    const sid = setInterval(spawn, 820);
    return () => clearInterval(sid);
  }, [spawn]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (pressing.current) focusedMs.current += 50;
    }, 50);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, endAt - Date.now());
      setRemainMs(r);
      if (r <= 0) {
        clearInterval(id);
        if (!finished.current) {
          finished.current = true;
          onDone({
            focusedMs: focusedMs.current,
            totalMs: durationMs,
            distractorHits: hits.current,
          });
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [durationMs, endAt, onDone]);

  const onHitDistractor = () => {
    hits.current += 1;
    void haptics.error();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <Text style={styles.time}>
          {t('brainRotTest.vibe.timeLeft', { sec: Math.ceil(remainMs / 1000) })}
        </Text>
      </View>
      <Text style={styles.phaseTitle}>{t('brainRotTest.vibe.phase.focusTitle')}</Text>
      <Text style={styles.hint}>{t('brainRotTest.vibe.phase.focusHint')}</Text>

      <View style={styles.arena}>
        {floaters.map((f) => (
          <Animated.View
            key={f.id}
            style={[
              f.kind === 'notif' ? styles.bubble : styles.memeBubble,
              { transform: [{ translateX: f.x }, { translateY: f.y }] },
            ]}
          >
            <TouchableOpacity onPress={onHitDistractor} activeOpacity={0.92}>
              <Text style={f.kind === 'notif' ? styles.bubbleText : styles.memeText}>{f.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.brainCore, pressed && styles.brainCorePressed]}
          onPressIn={() => {
            pressing.current = true;
            void haptics.light();
          }}
          onPressOut={() => {
            pressing.current = false;
          }}
        >
          <Text style={styles.brainEmoji}>🧠</Text>
          <Text style={styles.holdCue}>{t('brainRotTest.vibe.phase.focusHold')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  hud: { marginBottom: 8 },
  time: { color: '#a78bfa', fontSize: 15, fontWeight: '800' },
  phaseTitle: { color: '#888', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  hint: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 8, lineHeight: 21 },
  arena: { flex: 1, marginTop: 8 },
  brainCore: {
    position: 'absolute',
    left: SW / 2 - 78,
    top: SH * 0.22,
    maxWidth: '100%',
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#1e1433',
    borderWidth: 3,
    borderColor: '#a78bfa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  brainCorePressed: { backgroundColor: '#2a1850' },
  brainEmoji: { fontSize: 52 },
  holdCue: { color: '#a78bfa', fontSize: 11, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  bubble: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'rgba(24,24,30,0.94)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3f3f4a',
    maxWidth: 220,
  },
  memeBubble: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#111',
  },
  bubbleText: { color: '#e6e6e6', fontSize: 13, fontWeight: '700' },
  memeText: { color: '#111', fontSize: 18, fontWeight: '800' },
});
