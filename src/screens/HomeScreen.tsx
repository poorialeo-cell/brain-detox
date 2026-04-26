import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Easing, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import BrainVisual from '../components/BrainVisual';
import BrainRecoveryEffect from '../components/BrainRecoveryEffect';
import GradientBackground from '../components/GradientBackground';
import { useHaptics } from '../hooks/useHaptics';
import { PartnerType, MainTabParamList } from '../types';
import { getLevelFromXP } from '../services/scoringService';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

const PARTNER_CONFIG: Record<PartnerType, { emoji: string; color: string }> = {
  teacher:   { emoji: '🎯', color: '#f87171' },
  counselor: { emoji: '🌸', color: '#f9a8d4' },
  scientist: { emoji: '🔬', color: '#67e8f9' },
  trainer:   { emoji: '💪', color: '#fbbf24' },
};

const LEVEL_CONFIG = [
  { min: 91, key: 'home.level5', color: '#FFD700', emoji: '✨' },
  { min: 71, key: 'home.level4', color: '#EC4899', emoji: '🌸' },
  { min: 41, key: 'home.level3', color: '#A78BFA', emoji: '🍃' },
  { min: 21, key: 'home.level2', color: '#6B7280', emoji: '🍂' },
  { min: 0,  key: 'home.level1', color: '#7C3AED', emoji: '💀' },
];

function getLevelConfig(score: number) {
  return LEVEL_CONFIG.find((l) => score >= l.min) ?? LEVEL_CONFIG[LEVEL_CONFIG.length - 1];
}

export default function HomeScreen() {
  const { t } = useI18n();
  const haptics = useHaptics();
  const navigation = useNavigation<HomeNav>();
  const { brainScore, totalXP, streak, selectedPartner, pendingRecoveryEffect, clearRecoveryEffect } = useAppStore();

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];
  const lc = getLevelConfig(brainScore);
  const levelInfo = getLevelFromXP(totalXP);

  // フォーカス時に回復エフェクトを起動
  const [showEffect, setShowEffect] = React.useState(false);
  useFocusEffect(useCallback(() => {
    if (pendingRecoveryEffect) {
      setShowEffect(true);
    }
  }, [pendingRecoveryEffect]));

  // パートナーアバターのフロートアニメーション
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <GradientBackground>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.inner}>

        {/* ── ヘッダー ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>{t('home.title')}</Text>
            <View style={styles.levelRow}>
              <Text style={styles.levelBadgeSmall}>
                {t('level.label')}{levelInfo.level}
              </Text>
              <Text style={styles.levelNameSmall}>
                {t(levelInfo.nameKey)}
              </Text>
            </View>
          </View>
          <View style={styles.rightColumn}>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakCount}>{streak}</Text>
              </View>
            )}
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNumber, { color: lc.color }]}>{brainScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
        </View>

        {/* ── 脳ビジュアル ── */}
        <View style={styles.brainSection}>
          <View>
            <BrainVisual score={brainScore} />
            {showEffect && pendingRecoveryEffect && (
              <View style={styles.effectWrapper}>
                <BrainRecoveryEffect
                  size={pendingRecoveryEffect}
                  color={lc.color}
                  onComplete={() => {
                    setShowEffect(false);
                    clearRecoveryEffect();
                  }}
                />
              </View>
            )}
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelEmoji}>{lc.emoji}</Text>
            <Text style={[styles.levelText, { color: lc.color }]}>{t(lc.key)}</Text>
          </View>
        </View>

        {/* ── パートナー＋吹き出し ── */}
        <View style={styles.partnerRow}>
          <Animated.View style={[styles.avatar, { borderColor: pc.color + '88', transform: [{ translateY: floatAnim }] }]}>
            <Text style={styles.avatarEmoji}>{pc.emoji}</Text>
          </Animated.View>
          <View style={styles.bubbleWrapper}>
            {/* 吹き出しの尻尾 */}
            <View style={[styles.bubbleTail, { borderRightColor: pc.color + '55' }]} />
            <View style={[styles.bubble, { borderColor: pc.color + '44' }]}>
              <Text style={styles.bubbleText}>{t(`home.partnerGreeting.${partner}`)}</Text>
            </View>
          </View>
        </View>

        {/* ── スコアバー ── */}
        <View style={styles.barSection}>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${brainScore}%`, backgroundColor: lc.color }]} />
          </View>
          <Text style={styles.barLabel}>{t('home.scoreLabel')}</Text>
        </View>

        {/* ── アクションボタン ── */}
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: pc.color + '77' }]}
          onPress={() => { haptics.medium(); navigation.navigate('Action'); }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnIcon}>⚡</Text>
          <Text style={[styles.actionBtnText, { color: pc.color }]}>{t('home.actionButton')}</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
    justifyContent: 'space-between',
  },

  effectWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ヘッダー */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  levelBadgeSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a78bfa',
    backgroundColor: '#1e1433',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelNameSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 2.5,
  },
  rightColumn: {
    alignItems: 'flex-end', gap: 4,
  },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2a1a00', borderWidth: 1, borderColor: '#fbbf2455',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  streakEmoji: { fontSize: 14 },
  streakCount: { fontSize: 14, fontWeight: '800', color: '#fbbf24' },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreNumber: {
    fontSize: 30,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 14,
    color: '#444',
    fontWeight: '600',
  },

  /* 脳 */
  brainSection: {
    alignItems: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  levelEmoji: {
    fontSize: 14,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* パートナー */
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  bubbleWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderTopColor: 'transparent',
    borderBottomWidth: 7,
    borderBottomColor: 'transparent',
    borderRightWidth: 10,
    flexShrink: 0,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleText: {
    color: '#ddd',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },

  /* スコアバー */
  barSection: {
    gap: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  barBg: {
    height: 5,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* アクションボタン */
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 17,
    marginBottom: 2,
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
