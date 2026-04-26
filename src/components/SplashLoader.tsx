import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';

export default function SplashLoader() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
    ]).start();

    const animDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(400 - delay),
        ])
      ).start();
    };
    animDot(dot1, 0);
    animDot(dot2, 200);
    animDot(dot3, 400);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center', gap: 16 }}>
        <Text style={styles.emoji}>🧠</Text>
        <Text style={styles.title}>brain detox</Text>
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#a78bfa',
    letterSpacing: 2,
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
});
