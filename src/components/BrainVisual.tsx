import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

const BRAIN_SIZE = 160;
const GLOW_SIZE = BRAIN_SIZE + 70;
const CONTAINER_SIZE = GLOW_SIZE + 60;
const CENTER = CONTAINER_SIZE / 2;

type BrainLevel = 1 | 2 | 3 | 4 | 5;

interface BrainConfig {
  level: BrainLevel;
  primaryColor: string;
  glowColor: string;
  pulseDuration: number;
  pulseIntensity: number;
  particleColor: string;
  particleCount: number;
}

function getBrainConfig(score: number): BrainConfig {
  if (score >= 91) return {
    level: 5, primaryColor: '#FFD700', glowColor: '#FFD70055',
    pulseDuration: 1800, pulseIntensity: 1.06, particleColor: '#FFD700', particleCount: 8,
  };
  if (score >= 71) return {
    level: 4, primaryColor: '#EC4899', glowColor: '#EC489966',
    pulseDuration: 2000, pulseIntensity: 1.05, particleColor: '#86EFAC', particleCount: 6,
  };
  if (score >= 41) return {
    level: 3, primaryColor: '#A78BFA', glowColor: '#A78BFA44',
    pulseDuration: 2500, pulseIntensity: 1.04, particleColor: '#C4B5FD', particleCount: 4,
  };
  if (score >= 21) return {
    level: 2, primaryColor: '#6B7280', glowColor: '#6B728033',
    pulseDuration: 3500, pulseIntensity: 1.07, particleColor: '#4B5563', particleCount: 4,
  };
  return {
    level: 1, primaryColor: '#4C1D95', glowColor: '#7C3AED33',
    pulseDuration: 4500, pulseIntensity: 1.09, particleColor: '#1a0030', particleCount: 8,
  };
}

// 8つの粒子を等間隔に配置（少しバラつきを加える）
const PARTICLE_DEFS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * 2 * Math.PI;
  const r = BRAIN_SIZE / 2 + 28 + (i % 3) * 8;
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
    size: 6 + (i % 3) * 2,
    delay: i * 220,
  };
});

interface ParticleProps {
  x: number; y: number; size: number; color: string; delay: number;
}

function Particle({ x, y, size, color, delay }: ParticleProps) {
  const opacity = useRef(new Animated.Value(0.15)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0.95, duration: 1100, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.3, duration: 1100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0.15, duration: 1100, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.7, duration: 1100, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        left: CENTER + x - size / 2,
        top: CENTER + y - size / 2,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

export default function BrainVisual({ score }: { score: number }) {
  const config = getBrainConfig(score);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    const runPulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: config.pulseIntensity,
          duration: config.pulseDuration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: config.pulseDuration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) runPulse(); });
    };

    runPulse();
    return () => pulseAnim.stopAnimation();
  }, [config.level]);

  return (
    <View style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, alignItems: 'center', justifyContent: 'center' }}>

      {/* 外側グロー */}
      <Animated.View
        style={{
          position: 'absolute',
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          borderRadius: GLOW_SIZE / 2,
          backgroundColor: config.glowColor,
          transform: [{ scale: pulseAnim }],
        }}
      />

      {/* 中間グロー */}
      <Animated.View
        style={{
          position: 'absolute',
          width: BRAIN_SIZE + 30,
          height: BRAIN_SIZE + 30,
          borderRadius: (BRAIN_SIZE + 30) / 2,
          backgroundColor: config.primaryColor + '22',
          transform: [{ scale: pulseAnim }],
        }}
      />

      {/* 脳本体 */}
      <Animated.View
        style={{
          width: BRAIN_SIZE,
          height: BRAIN_SIZE,
          borderRadius: BRAIN_SIZE / 2,
          backgroundColor: config.primaryColor,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale: pulseAnim }],
          shadowColor: config.primaryColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 24,
          elevation: 15,
          zIndex: 2,
        }}
      >
        <Text style={{ fontSize: 70 }}>🧠</Text>

        {/* Lv.1専用：亀裂エフェクト */}
        {config.level === 1 && (
          <>
            <View style={{ position: 'absolute', width: 2, height: 54, backgroundColor: '#00000099', top: 16, left: 50, transform: [{ rotate: '13deg' }], borderRadius: 1 }} />
            <View style={{ position: 'absolute', width: 2, height: 36, backgroundColor: '#00000099', top: 46, right: 33, transform: [{ rotate: '-19deg' }], borderRadius: 1 }} />
            <View style={{ position: 'absolute', width: 2, height: 26, backgroundColor: '#00000099', bottom: 20, left: 40, transform: [{ rotate: '6deg' }], borderRadius: 1 }} />
          </>
        )}
      </Animated.View>

      {/* Lv.1-2：霧オーバーレイ */}
      {config.level <= 2 && (
        <View
          style={{
            position: 'absolute',
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            backgroundColor: config.level === 1 ? '#00000060' : '#00000030',
            zIndex: 1,
          }}
        />
      )}

      {/* Lv.3-5：パーティクル */}
      {config.level >= 3 &&
        PARTICLE_DEFS.slice(0, config.particleCount).map((p, i) => (
          <Particle
            key={i}
            x={p.x}
            y={p.y}
            size={p.size}
            color={config.particleColor}
            delay={p.delay}
          />
        ))}
    </View>
  );
}
