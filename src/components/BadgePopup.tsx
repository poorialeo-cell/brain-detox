import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { useHaptics } from '../hooks/useHaptics';
import { Badge } from '../types';

interface Props {
  badge: Badge;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export default function BadgePopup({ badge, onDismiss }: Props) {
  const { t } = useI18n();
  const haptics = useHaptics();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    haptics.success();

    // 登場
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 14, stiffness: 150, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale,      { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
    ]).start();

    // 3秒後に自動消去
    const timer = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 280, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <TouchableOpacity style={[styles.card, { borderColor: badge.color + '66' }]} onPress={dismiss} activeOpacity={0.9}>
        <Text style={styles.newLabel}>{t('badges.newBadge')}</Text>
        <View style={styles.row}>
          <View style={[styles.emojiBox, { backgroundColor: badge.color + '22' }]}>
            <Text style={styles.emoji}>{badge.emoji}</Text>
          </View>
          <View style={styles.textBox}>
            <Text style={[styles.name, { color: badge.color }]}>{t(badge.nameKey)}</Text>
            <Text style={styles.desc}>{t(badge.descriptionKey)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  newLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emojiBox: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 28 },
  textBox: { flex: 1 },
  name: {
    fontSize: 18, fontWeight: '800', marginBottom: 3,
  },
  desc: {
    fontSize: 13, color: '#888', fontWeight: '500',
  },
});
