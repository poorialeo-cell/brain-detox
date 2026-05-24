import React from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { getBrainTier } from '../utils/brainTier';

// 脳ビジュアルが「画面のおおむね上半分」に収まるよう、シーン高の上限（画面高の比率）
const MAX_SCENE_HEIGHT_FRACTION = 0.42;
const HORIZONTAL_INSET = 44;
const IMAGE_MAX = 420;
const VERTICAL_GUTTER = 10;
const IMAGE_MIN = 80;

/**
 * 透過PNGを10枚用意し、スコア帯で切り替え（アニメーションなし）。
 *
 * ファイル名（assets に配置）:
 *   brain_tier_01.png  … スコア 1–10
 *   …
 *   brain_tier_10.png  … 91–100
 */
const BRAIN_TIER_SOURCES = [
  require('../../assets/brain_tier_01.png'),
  require('../../assets/brain_tier_02.png'),
  require('../../assets/brain_tier_03.png'),
  require('../../assets/brain_tier_04.png'),
  require('../../assets/brain_tier_05.png'),
  require('../../assets/brain_tier_06.png'),
  require('../../assets/brain_tier_07.png'),
  require('../../assets/brain_tier_08.png'),
  require('../../assets/brain_tier_09.png'),
  require('../../assets/brain_tier_10.png'),
] as const;

export default function BrainCanvas({
  score,
  contentWidth,
  maxImageSize = IMAGE_MAX,
}: {
  score: number;
  /** 親のカード内幅など。未指定時は従来どおり画面幅ベース */
  contentWidth?: number;
  /** 画像の最大一辺（埋め込み時は小さめに抑えられる） */
  maxImageSize?: number;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const sceneW = contentWidth ?? screenW - HORIZONTAL_INSET;
  const maxSceneH = screenH * MAX_SCENE_HEIGHT_FRACTION;
  const imageSize = Math.max(
    IMAGE_MIN,
    Math.min(maxImageSize, maxSceneH - VERTICAL_GUTTER, sceneW * 0.92),
  );
  const sceneH = imageSize + VERTICAL_GUTTER;

  const tier = getBrainTier(score);
  const source = BRAIN_TIER_SOURCES[tier - 1];

  return (
    <View style={[styles.scene, { width: sceneW, height: sceneH }]}>
      <Image
        source={source}
        style={{ width: imageSize, height: imageSize }}
        resizeMode="contain"
        accessibilityLabel={`Brain state tier ${tier} of 10`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
