import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Animated, Easing, View, Image, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { PULSE, BRAIN_FRAMES } from '../config/brainConfig';

// ── 画像アセット ──────────────────────────────────────────────────────
const BRAIN_IMAGES = [
  require('../../assets/brain_lv1.png.png'),
  require('../../assets/brain_lv2.png.png'),
  require('../../assets/brain_lv3.png.png'),
  require('../../assets/brain_lv4.png.png'),
  require('../../assets/brain_lv5.png.png'),
];

// ── 設定 ─────────────────────────────────────────────────────────────
const BRAIN_SIZE = 220; // 画像のサイズ（後から変えるだけでOK）

// ── 補間ユーティリティ ────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// スコア → 脳レベル（1.0〜5.0）の連続値
function scoreToLevel(score: number): number {
  return 1 + (score / 100) * 4;
}

// スコアに対応するパーティクル色
function getParticleColor(score: number): { r: number; g: number; b: number } {
  const frames = BRAIN_FRAMES;
  let lo = frames[0]; let hi = frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    if (score >= frames[i].score && score <= frames[i + 1].score) {
      lo = frames[i]; hi = frames[i + 1]; break;
    }
  }
  const t = (score - lo.score) / Math.max(1, hi.score - lo.score);
  return {
    r: Math.round(lerp(lo.ptR, hi.ptR, t)),
    g: Math.round(lerp(lo.ptG, hi.ptG, t)),
    b: Math.round(lerp(lo.ptB, hi.ptB, t)),
  };
}

// ── パーティクルコンポーネント ────────────────────────────────────────
function BrainParticles({ score, frame }: { score: number; frame: number }) {
  const frames = BRAIN_FRAMES;
  let lo = frames[0]; let hi = frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    if (score >= frames[i].score && score <= frames[i + 1].score) {
      lo = frames[i]; hi = frames[i + 1]; break;
    }
  }
  const t2 = (score - lo.score) / Math.max(1, hi.score - lo.score);
  const ptCount = Math.round(lerp(lo.ptCount, hi.ptCount, t2));
  const ptRiseSpeed = lerp(lo.ptRiseSpeed, hi.ptRiseSpeed, t2);
  const { r, g, b } = getParticleColor(score);

  const particles = useMemo(() => Array.from({ length: ptCount }, (_, i) => {
    const seed = i * 137.5 + i * 23;
    const angle = (seed % 360) * Math.PI / 180;
    const radius = BRAIN_SIZE * 0.38 + (seed % 22);
    const cx = BRAIN_SIZE / 2 + Math.cos(angle) * radius;
    const speed = ptRiseSpeed * (0.8 + (i % 3) * 0.2);
    const phase = (frame * speed + seed * 7) % 100;
    const cy = BRAIN_SIZE / 2 - 20 - phase;
    const life = 1 - phase / 100;
    const size = 2.5 + (i % 3) * 0.8;
    return { cx: cx + Math.sin(frame * 0.02 + seed) * 7, cy, life, size };
  }), [frame, ptCount, ptRiseSpeed]);

  return (
    <Svg width={BRAIN_SIZE} height={BRAIN_SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((pt, i) => (
        <Circle key={i} cx={pt.cx} cy={pt.cy} r={pt.size}
          fill={`rgba(${r},${g},${b},${(pt.life * 0.85).toFixed(2)})`} />
      ))}
    </Svg>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────
export default function BrainCanvas({ score }: { score: number }) {
  const [frame, setFrame] = useState(0);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0.6)).current;

  // フレームカウント（パーティクル用）
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 7200), 50);
    return () => clearInterval(id);
  }, []);

  // パルスアニメーション
  useEffect(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    const maxScale = lerp(PULSE.maxScaleLow, PULSE.maxScaleHigh, score / 100);
    const duration = lerp(PULSE.durationLow, PULSE.durationHigh, score / 100);
    const eIn  = score < 40 ? Easing.in(Easing.quad)  : Easing.inOut(Easing.sin);
    const eOut = score < 40 ? Easing.out(Easing.quad) : Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: maxScale, duration: duration / 2, easing: eIn,  useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,        duration: duration / 2, easing: eOut, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [Math.floor(score / 10)]);

  // グローパルス
  useEffect(() => {
    const glowDuration = lerp(3000, 1400, score / 100);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1.0, duration: glowDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: glowDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [Math.floor(score / 10)]);

  // クロスフェード計算
  const level    = scoreToLevel(score);          // 1.0〜5.0
  const lowerIdx = Math.min(4, Math.floor(level - 1)); // 0〜4
  const upperIdx = Math.min(4, lowerIdx + 1);          // 0〜4
  const blend    = level - Math.floor(level);          // 0〜1（小数部）

  // グロー色
  const { r, g, b } = getParticleColor(score);
  const glowColor = `rgba(${r},${g},${b},`;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>

      {/* グロー（スコアが高いほど強い） */}
      {score > 30 && (
        <Animated.View style={[
          styles.glow,
          {
            backgroundColor: glowColor + '0)',
            shadowColor:  glowColor + '1)',
            shadowRadius: lerp(8, 40, score / 100),
            shadowOpacity: glowAnim,
            opacity: glowAnim,
          },
        ]} />
      )}

      {/* 下位レベルの脳画像 */}
      <Image
        source={BRAIN_IMAGES[lowerIdx]}
        style={styles.brainImage}
        resizeMode="contain"
      />

      {/* 上位レベルの脳画像（クロスフェード） */}
      {blend > 0.01 && (
        <Image
          source={BRAIN_IMAGES[upperIdx]}
          style={[styles.brainImage, styles.brainImageOverlay, { opacity: blend }]}
          resizeMode="contain"
        />
      )}

      {/* パーティクル */}
      <BrainParticles score={score} frame={frame} />

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BRAIN_SIZE,
    height: BRAIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: BRAIN_SIZE * 1.1,
    height: BRAIN_SIZE * 1.1,
    borderRadius: BRAIN_SIZE * 0.55,
    shadowOffset: { width: 0, height: 0 },
  },
  brainImage: {
    width: BRAIN_SIZE,
    height: BRAIN_SIZE,
  },
  brainImageOverlay: {
    position: 'absolute',
    top: 0, left: 0,
  },
});
