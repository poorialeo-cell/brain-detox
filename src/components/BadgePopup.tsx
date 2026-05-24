import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { useAppStore } from '../store/useAppStore';
import { Badge, PartnerType } from '../types';
import PartnerPortrait from './PartnerPortrait';
import { PARTNER_UI } from '../config/partnerUi';

interface Props {
  badge: Badge;
  onDismiss: () => void;
}

const PARTNER_CONFIG: Record<PartnerType, { emoji: string; color: string }> = {
  teacher:   { emoji: '🎯', color: '#f87171' },
  counselor: { emoji: '🌸', color: '#f9a8d4' },
  scientist: { emoji: '🔬', color: '#67e8f9' },
  trainer:   { emoji: '💪', color: '#fbbf24' },
};

export default function BadgePopup({ badge, onDismiss }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();
  const partner = useAppStore((s) => s.selectedPartner) ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];

  const translateY  = useRef(new Animated.Value(-220)).current;
  const opacity     = useRef(new Animated.Value(0)).current;
  const emojiScale  = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    haptics.success();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 14, stiffness: 150, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.spring(emojiScale, { toValue: 1, damping: 10, stiffness: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -220, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity style={[styles.card, { borderColor: badge.color + '66' }]} onPress={dismiss} activeOpacity={0.95}>

        {/* ヘッダーラベル */}
        <Text style={styles.headerLabel}>{t('badges.newBadge')}</Text>

        {/* バッジ情報 */}
        <View style={styles.badgeRow}>
          <Animated.View style={[styles.emojiBox, { backgroundColor: badge.color + '22', transform: [{ scale: emojiScale }] }]}>
            <Text style={styles.emoji}>{badge.emoji}</Text>
          </Animated.View>
          <View style={styles.textBox}>
            <Text style={[styles.badgeName, { color: badge.color }]}>{t(badge.nameKey)}</Text>
            <Text style={styles.badgeDesc}>{t(badge.descriptionKey)}</Text>
          </View>
        </View>

        {/* 区切り線 */}
        <View style={styles.divider} />

        {/* パートナーの褒め言葉 */}
        <View style={styles.praiseRow}>
          <PartnerPortrait
            partner={partner}
            pose="praise"
            size={PARTNER_UI.badgePortrait}
            borderColor={pc.color}
            borderWidth={3}
          />
          <View style={styles.bubbleWrapper}>
            <View style={[styles.bubbleTail, { borderRightColor: pc.color + '55' }]} />
            <View style={[styles.bubble, { borderColor: pc.color + '44' }]}>
              <Text style={[styles.praiseText, { color: pc.color }]}>
                {t(`badges.badgePraise.${partner}`)}
              </Text>
            </View>
          </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  headerLabel: {
    fontSize: 11, fontWeight: '700', color: '#666',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  emojiBox: {
    width: 64, height: 64, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  emoji: { fontSize: 36 },
  textBox: { flex: 1 },
  badgeName: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  badgeDesc: { fontSize: 13, color: '#888', fontWeight: '500', lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#222' },
  praiseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bubbleWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 0, paddingTop: 2 },
  bubbleTail: {
    width: 0, height: 0,
    borderTopWidth: 6, borderTopColor: 'transparent',
    borderBottomWidth: 6, borderBottomColor: 'transparent',
    borderRightWidth: 8, flexShrink: 0,
  },
  bubble: {
    flex: 1, backgroundColor: '#1a1a1a', borderWidth: 1,
    borderRadius: 14, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  praiseText: { fontSize: 14, fontWeight: '700', fontStyle: 'italic', lineHeight: 21 },
});
