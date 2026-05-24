import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  ImageResizeMode,
  ActivityIndicator,
} from 'react-native';
import { PartnerType, PartnerPose } from '../types';
import { PARTNER_IMAGE_SOURCES } from '../config/partnerAssets';

/** 縦3 : 横2（高さ = 幅 × この値） */
export const PARTNER_FRAME_HEIGHT_PER_WIDTH = 3 / 2;

const DEFAULT_CORNER_RADIUS = 14;

type Props = {
  partner: PartnerType;
  pose: PartnerPose;
  /** フレームの幅（高さは 3:2 で自動） */
  size: number;
  borderColor: string;
  borderWidth?: number;
  /** 角丸（円ではなく長方形の角） */
  cornerRadius?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  resizeMode?: ImageResizeMode;
  /** false ならデコード待ちインジケータを出さない */
  showLoadingIndicator?: boolean;
};

export default function PartnerPortrait({
  partner,
  pose,
  size,
  borderColor,
  borderWidth = 2,
  cornerRadius = DEFAULT_CORNER_RADIUS,
  style,
  imageStyle,
  resizeMode = 'cover',
  showLoadingIndicator = true,
}: Props) {
  const frameW = size;
  const frameH = size * PARTNER_FRAME_HEIGHT_PER_WIDTH;
  const [decoded, setDecoded] = useState(false);
  const onLoadEnd = useCallback(() => setDecoded(true), []);

  useEffect(() => {
    setDecoded(false);
  }, [partner, pose]);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: frameW,
          height: frameH,
          borderRadius: cornerRadius,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      {showLoadingIndicator && !decoded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={borderColor} size="small" />
        </View>
      )}
      <Image
        source={PARTNER_IMAGE_SOURCES[partner][pose]}
        style={[
          { width: frameW, height: frameH, opacity: decoded ? 1 : 0 },
          imageStyle,
        ]}
        resizeMode={resizeMode}
        onLoadEnd={onLoadEnd}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
