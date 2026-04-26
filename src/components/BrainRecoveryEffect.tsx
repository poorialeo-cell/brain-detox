import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { RecoveryEffectSize } from '../types';

interface Props {
  size: RecoveryEffectSize;
  color: string;
  onComplete: () => void;
}

const SIZE_CONFIG = {
  small:  { rings: 1, particleCount: 4, maxScale: 2.0, duration: 700  },
  medium: { rings: 2, particleCount: 6, maxScale: 2.6, duration: 900  },
  large:  { rings: 3, particleCount: 8, maxScale: 3.2, duration: 1200 },
};

// 1つのリングエフェクト
function Ring({ color, delay, maxScale, duration }: { color: string; delay: number; maxScale: number; duration: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale,   { toValue: maxScale, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,        duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

// パーティクル
function Particle({ color, angle, delay, distance }: { color: string; angle: number; delay: number; distance: number }) {
  const rad = (angle * Math.PI) / 180;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1,                         duration: 100, useNativeDriver: true }),
        Animated.spring(scale,      { toValue: 1, damping: 10, stiffness: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: Math.cos(rad) * distance,  duration: 800, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: Math.sin(rad) * distance,  duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function BrainRecoveryEffect({ size, color, onComplete }: Props) {
  const cfg = SIZE_CONFIG[size];
  const totalDuration = cfg.duration + 300 + 200;

  useEffect(() => {
    const timer = setTimeout(onComplete, totalDuration);
    return () => clearTimeout(timer);
  }, [onComplete, totalDuration]);

  const particles = Array.from({ length: cfg.particleCount }, (_, i) => ({
    angle: (i / cfg.particleCount) * 360,
    delay: i * 30,
    distance: 60 + Math.random() * 40,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* リング */}
      {Array.from({ length: cfg.rings }, (_, i) => (
        <Ring
          key={i}
          color={color}
          delay={i * 150}
          maxScale={cfg.maxScale - i * 0.3}
          duration={cfg.duration}
        />
      ))}

      {/* パーティクル */}
      {particles.map((p, i) => (
        <Particle
          key={i}
          color={color}
          angle={p.angle}
          delay={p.delay}
          distance={p.distance}
        />
      ))}
    </View>
  );
}

const BRAIN_SIZE = 160;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BRAIN_SIZE,
    height: BRAIN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: BRAIN_SIZE,
    height: BRAIN_SIZE,
    borderRadius: BRAIN_SIZE / 2,
    borderWidth: 2,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
