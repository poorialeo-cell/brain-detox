import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Easing,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { Badge } from '../types';

interface Props {
  badge: Badge | null;
  onClose: () => void;
}

export default function BadgeDetailModal({ badge, onClose }: Props) {
  const { t } = useI18n();

  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (badge) {
      Animated.parallel([
        Animated.timing(backdropOp, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 16, stiffness: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [badge]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOp, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 400, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!badge) return null;

  const earned = !!badge.earnedAt;
  const dateStr = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString()
    : null;

  return (
    <Modal transparent visible={!!badge} onRequestClose={handleClose} animationType="none">
      {/* バックドロップ */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOp }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* カード */}
      <Animated.View style={[styles.card, { transform: [{ translateY }] }]}>

        {/* バッジイラスト */}
        <View style={[styles.emojiCircle, { backgroundColor: badge.color + (earned ? '22' : '11'), borderColor: badge.color + (earned ? '55' : '22') }]}>
          <Text style={[styles.emoji, !earned && styles.emojiLocked]}>{badge.emoji}</Text>
          {earned && <View style={[styles.earnedDot, { backgroundColor: badge.color }]} />}
        </View>

        {/* バッジ名 */}
        <Text style={[styles.name, { color: earned ? badge.color : '#555' }]}>{t(badge.nameKey)}</Text>

        {/* 獲得状況 */}
        <View style={[styles.statusBadge, { backgroundColor: earned ? badge.color + '22' : '#222', borderColor: earned ? badge.color + '55' : '#333' }]}>
          <Text style={[styles.statusText, { color: earned ? badge.color : '#555' }]}>
            {earned ? `✓ ${t('badges.earnedOn').replace('{{date}}', dateStr ?? '')}` : t('badges.notYetEarned')}
          </Text>
        </View>

        {/* 獲得条件 */}
        <View style={styles.conditionBox}>
          <Text style={styles.conditionLabel}>{t('badges.condition')}</Text>
          <Text style={styles.conditionText}>{t(badge.descriptionKey)}</Text>
        </View>

        {/* 閉じるボタン */}
        <TouchableOpacity
          style={[styles.closeBtn, earned && { backgroundColor: badge.color }]}
          onPress={handleClose}
          activeOpacity={0.85}
        >
          <Text style={[styles.closeBtnText, earned && { color: '#000' }]}>{t('badges.close')}</Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  backdropTouch: { flex: 1 },

  card: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#161616',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },

  emojiCircle: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  emoji: { fontSize: 48 },
  emojiLocked: { opacity: 0.3 },
  earnedDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#161616',
    justifyContent: 'center', alignItems: 'center',
  },

  name: {
    fontSize: 24, fontWeight: '900', textAlign: 'center',
  },

  statusBadge: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  conditionBox: {
    width: '100%', backgroundColor: '#1a1a1a',
    borderRadius: 14, padding: 16, gap: 6,
  },
  conditionLabel: {
    fontSize: 11, fontWeight: '700', color: '#555',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  conditionText: {
    fontSize: 15, color: '#ccc', lineHeight: 22, fontWeight: '500',
  },

  closeBtn: {
    width: '100%', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  closeBtnText: { fontSize: 16, fontWeight: '800', color: '#888' },
});
