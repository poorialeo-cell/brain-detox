import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import BrainVisual from '../components/BrainVisual';
import { PartnerType, MainTabParamList } from '../types';

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
  const navigation = useNavigation<HomeNav>();
  const { brainScore, selectedPartner } = useAppStore();

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];
  const lc = getLevelConfig(brainScore);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      <View style={styles.inner}>

        {/* ── ヘッダー ── */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>{t('home.title')}</Text>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, { color: lc.color }]}>{brainScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        {/* ── 脳ビジュアル ── */}
        <View style={styles.brainSection}>
          <BrainVisual score={brainScore} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelEmoji}>{lc.emoji}</Text>
            <Text style={[styles.levelText, { color: lc.color }]}>{t(lc.key)}</Text>
          </View>
        </View>

        {/* ── パートナー＋吹き出し ── */}
        <View style={styles.partnerRow}>
          <View style={[styles.avatar, { borderColor: pc.color + '66' }]}>
            <Text style={styles.avatarEmoji}>{pc.emoji}</Text>
          </View>
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
          onPress={() => navigation.navigate('Action')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnIcon}>⚡</Text>
          <Text style={[styles.actionBtnText, { color: pc.color }]}>{t('home.actionButton')}</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
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
    paddingBottom: 12,
    justifyContent: 'space-between',
  },

  /* ヘッダー */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 2.5,
  },
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
