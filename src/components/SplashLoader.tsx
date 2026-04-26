import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashLoader() {
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(20)).current;
  const titleOp     = useRef(new Animated.Value(0)).current;
  const dots        = [useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current];

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, damping: 12, stiffness: 120, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY,  { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1,   duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 380, useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      ).start();
    });
  }, []);

  return (
    <LinearGradient colors={['#0d0d0d', '#0a0818']} style={styles.container}>
      {/* 背景グロー */}
      <Animated.View style={[styles.bgGlow, { opacity: logoOpacity }]} />

      {/* ロゴ */}
      <Animated.Text style={[styles.emoji, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        🧠
      </Animated.Text>

      {/* タイトル */}
      <Animated.View style={{ opacity: titleOp, transform: [{ translateY: titleY }], alignItems: 'center', gap: 6 }}>
        <Text style={styles.title}>brain detox</Text>
        <Text style={styles.subtitle}>ブレインロット、今日から終わり。</Text>
      </Animated.View>

      {/* ローディングドット */}
      <Animated.View style={[styles.dotsRow, { opacity: titleOp }]}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20,
  },
  bgGlow: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#a78bfa10',
  },
  emoji: { fontSize: 72 },
  title: {
    fontSize: 26, fontWeight: '900', color: '#a78bfa', letterSpacing: 3,
  },
  subtitle: {
    fontSize: 13, color: '#444', fontWeight: '500', letterSpacing: 0.5,
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#a78bfa' },
});
