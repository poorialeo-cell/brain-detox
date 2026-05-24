import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import BrainCanvas from '../components/BrainCanvas';
import BrainRecoveryEffect from '../components/BrainRecoveryEffect';
import GradientBackground from '../components/GradientBackground';
import PartnerPortrait from '../components/PartnerPortrait';
import { useHaptics } from '../hooks/useHaptics';
import { PartnerType, MainTabParamList } from '../types';
import { getLevelFromXP } from '../services/scoringService';
import { getHomePartnerPose } from '../utils/partnerPose';
import { PARTNER_UI } from '../config/partnerUi';
import { generateHomePartnerMessage } from '../services/openAIService';
import HomeStatHintOverlay, { HomeStatHintAnchor } from '../components/HomeStatHintOverlay';
import { useTheme } from '../hooks/useTheme';
import { useEffectiveBrainScore } from '../hooks/useEffectiveBrainScore';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

type StatHintKey = 'level' | 'streak' | 'score' | 'state';

const PARTNER_CONFIG: Record<PartnerType, { color: string }> = {
  teacher:   { color: '#f87171' },
  counselor: { color: '#f9a8d4' },
  scientist: { color: '#67e8f9' },
  trainer:   { color: '#fbbf24' },
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

// ── ホーム用パートナーメッセージのメモリキャッシュ ────────────────────────
// OpenAI 呼び出しコストを抑えるため、同じスコア帯では一定時間 (30分) 再利用する
const HOME_MESSAGE_TTL_MS = 30 * 60 * 1000;
type HomeMessageCache = { key: string; message: string; ts: number };
let homeMessageCache: HomeMessageCache | null = null;

/** スコアを 5 段階の帯にまとめる（少しの変動で再リクエストしないため） */
function getHomeScoreBand(score: number): number {
  if (score >= 91) return 5;
  if (score >= 71) return 4;
  if (score >= 41) return 3;
  if (score >= 21) return 2;
  return 1;
}

function buildHomeMessageCacheKey(partner: PartnerType, score: number, lang: string): string {
  return `${partner}|${getHomeScoreBand(score)}|${lang}`;
}

/** テスト用にキャッシュをクリアするための公開ヘルパー */
export function clearHomeMessageCache(): void {
  homeMessageCache = null;
}

/** カード内の BrainCanvas 用幅（スクロール余白・カード padding を除く） */
function useBrainContentWidth(): number {
  const { width: winW } = useWindowDimensions();
  const scrollPad = 22 * 2;
  const cardPad = 16 * 2;
  return Math.max(200, winW - scrollPad - cardPad);
}

export default function HomeScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const haptics = useHaptics();
  const navigation = useNavigation<HomeNav>();
  const language = useAppStore((s) => s.language);
  const brainContentW = useBrainContentWidth();

  const {
    totalXP,
    streak,
    selectedPartner,
    pendingRecoveryEffect,
    clearRecoveryEffect,
  } = useAppStore();
  const brainScore = useEffectiveBrainScore();

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];
  const lc = getLevelConfig(brainScore);
  const levelInfo = getLevelFromXP(totalXP);
  const homePartnerPose = getHomePartnerPose(brainScore);

  const [partnerHomeMessage, setPartnerHomeMessage] = useState('');
  const [homeMessageLoading, setHomeMessageLoading] = useState(true);

  const levelRef = useRef<View>(null);
  const streakRef = useRef<View>(null);
  const scoreRef = useRef<View>(null);
  const stateRef = useRef<View>(null);
  const [hint, setHint] = useState<{ key: StatHintKey; anchor: HomeStatHintAnchor } | null>(null);

  const dismissHint = useCallback(() => {
    setHint(null);
  }, []);

  const openStatHint = useCallback(
    (key: StatHintKey, ref: React.RefObject<View | null>) => {
      haptics.light();
      ref.current?.measureInWindow((x, y, width, height) => {
        setHint({ key, anchor: { x, y, w: width, h: height } });
      });
    },
    [haptics],
  );

  const loadPartnerHomeMessage = useCallback(async () => {
    const cacheKey = buildHomeMessageCacheKey(partner, brainScore, language);

    // キャッシュヒット → API 呼び出しスキップ
    if (
      homeMessageCache &&
      homeMessageCache.key === cacheKey &&
      Date.now() - homeMessageCache.ts < HOME_MESSAGE_TTL_MS
    ) {
      setPartnerHomeMessage(homeMessageCache.message);
      setHomeMessageLoading(false);
      return;
    }

    setHomeMessageLoading(true);
    try {
      const msg = await generateHomePartnerMessage({
        partner,
        brainScore,
        language,
      });
      setPartnerHomeMessage(msg);
      homeMessageCache = { key: cacheKey, message: msg, ts: Date.now() };
    } catch {
      // レート制限・通信失敗時は静的グリーティングにフォールバック
      const fallback = t(`home.partnerGreeting.${partner}`);
      setPartnerHomeMessage(fallback);
      // フォールバックも短時間キャッシュ（5分）して連続呼び出しを抑止
      homeMessageCache = { key: cacheKey, message: fallback, ts: Date.now() - (HOME_MESSAGE_TTL_MS - 5 * 60 * 1000) };
    } finally {
      setHomeMessageLoading(false);
    }
  }, [partner, brainScore, language, t]);

  useFocusEffect(
    useCallback(() => {
      loadPartnerHomeMessage();
    }, [loadPartnerHomeMessage]),
  );

  const [showEffect, setShowEffect] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (pendingRecoveryEffect) setShowEffect(true);
    }, [pendingRecoveryEffect]),
  );

  return (
    <GradientBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, styles.scrollContentGrow]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.homeTopMeta}>
            <View style={styles.homeTopMetaLeft}>
              <View ref={levelRef} collapsable={false}>
                <Pressable
                  onPress={() => openStatHint('level', levelRef)}
                  style={({ pressed }) => [styles.statHitArea, pressed && styles.statHitPressed]}
                >
                  <View style={styles.levelRow}>
                    <Text style={[styles.levelBadgeSmall, { color: theme.colors.accentText, backgroundColor: theme.colors.accentSoft }]}>
                      {t('level.label')}
                      {levelInfo.level}
                    </Text>
                    <Text style={[styles.levelNameSmall, { color: theme.colors.textSubtle }]}>{t(levelInfo.nameKey)}</Text>
                  </View>
                </Pressable>
              </View>
              <View ref={streakRef} collapsable={false}>
                <Pressable
                  onPress={() => openStatHint('streak', streakRef)}
                  style={({ pressed }) => [styles.statHitArea, pressed && styles.statHitPressed]}
                >
                  <View style={[styles.streakBadge, streak === 0 && styles.streakBadgeMuted]}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={styles.streakCount}>{streak}</Text>
                    <Text style={styles.streakSuffix}>{t('streak.label')}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ── Brain Monitor ── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSubtle }]}>{t('home.brainMonitorTitle')}</Text>

            <View style={styles.brainMonitorBody}>
              <View style={styles.brainCanvasArea}>
                <View style={styles.brainCanvasInner}>
                  <BrainCanvas
                    score={brainScore}
                    contentWidth={brainContentW}
                    maxImageSize={288}
                  />
                  {showEffect && pendingRecoveryEffect && (
                    <View style={styles.effectWrapper} pointerEvents="none">
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
              </View>

              <View style={styles.brainBottomRow}>
                <View style={styles.brainBottomHalf}>
                  <View ref={scoreRef} collapsable={false} style={styles.brainScoreTapWrap}>
                    <Pressable
                      onPress={() => openStatHint('score', scoreRef)}
                      style={({ pressed }) => [styles.statHitArea, styles.brainScorePressable, pressed && styles.statHitPressed]}
                    >
                      <View style={styles.brainScoreLeft} pointerEvents="box-none">
                        <Text style={[styles.brainScoreHeading, { color: theme.colors.textSubtle }]}>{t('home.scoreLabel')}</Text>
                        <View style={styles.scoreBox}>
                          <Text style={[styles.scoreNumber, { color: lc.color }]}>{brainScore}</Text>
                          <Text style={[styles.scoreMax, { color: theme.colors.textSubtle }]}>/100</Text>
                        </View>
                        <View style={styles.barSectionCompact}>
                          <View style={[styles.barBgSmall, { backgroundColor: theme.colors.border }]}>
                            <View
                              style={[styles.barFillSmall, { width: `${brainScore}%`, backgroundColor: lc.color }]}
                            />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.brainBottomHalf}>
                  <View ref={stateRef} collapsable={false} style={styles.stateTapWrap}>
                    <Pressable
                      onPress={() => openStatHint('state', stateRef)}
                      style={({ pressed }) => [styles.statHitArea, styles.statePressable, pressed && styles.statHitPressed]}
                    >
                      <View style={styles.brainStateRow}>
                        <Text style={styles.levelEmoji}>{lc.emoji}</Text>
                        <Text style={[styles.levelText, { color: lc.color }]}>{t(lc.key)}</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── Your Partner ── */}
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSubtle }]}>{t('home.yourPartnerTitle')}</Text>

            <View style={styles.partnerRow}>
              <View style={styles.partnerPortraitWrap}>
                <PartnerPortrait
                  partner={partner}
                  pose={homePartnerPose}
                  size={PARTNER_UI.homePartnerSectionPortrait}
                  borderColor={pc.color}
                  borderWidth={0}
                  showLoadingIndicator
                />
              </View>

              <View style={styles.partnerBubbleOnly}>
                <View style={[styles.partnerBubble, { borderColor: pc.color + '55', backgroundColor: theme.colors.cardAlt }]}>
                  <Text style={[styles.partnerNameLine, { color: pc.color }]}>
                    {t(`partner.${partner}.name`)}
                  </Text>
                  {homeMessageLoading ? (
                    <View style={styles.messageLoadingRow}>
                      <ActivityIndicator color={pc.color} size="small" />
                    <Text style={[styles.messageLoadingText, { color: theme.colors.textSubtle }]}>{t('home.partnerMessageLoading')}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.partnerMessageBody, { color: theme.colors.text }]}>{partnerHomeMessage}</Text>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionBtnFull, { borderColor: pc.color + '77', backgroundColor: theme.colors.cardAlt }]}
              onPress={() => {
                haptics.medium();
                navigation.navigate('Action');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnIcon}>⚡</Text>
              <Text style={[styles.actionBtnText, { color: pc.color }]}>{t('home.actionButton')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <HomeStatHintOverlay
          visible={!!hint}
          anchor={hint?.anchor ?? null}
          text={hint ? t(`home.hints.${hint.key}`) : ''}
          onDismiss={dismissHint}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  scroll: { flex: 1 },
  /** 子のサイズだけに縮まず、常にビューポート幅でレイアウト（カード端＝セクション端） */
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  scrollContentGrow: {
    flexGrow: 1,
    width: '100%',
  },

  homeTopMeta: {
    marginBottom: 14,
  },
  homeTopMetaLeft: {
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },

  statHitArea: {
    alignSelf: 'flex-start',
    borderRadius: 10,
  },
  statHitPressed: {
    opacity: 0.85,
  },
  brainScoreTapWrap: {
    alignItems: 'center',
    width: '100%',
  },
  brainScorePressable: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  stateTapWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statePressable: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },

  sectionCard: {
    backgroundColor: '#101014',
    borderWidth: 1,
    borderColor: '#2a2a30',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    width: '100%',
    maxWidth: '100%',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b6b76',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  brainMonitorBody: {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
  },
  /** 脳の下を左右均等に分割し、各ブロックの中心にコンテンツを配置（幅は親＝セクション内幅に限定） */
  brainBottomRow: {
    width: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 4,
    marginBottom: 4,
  },
  brainBottomHalf: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  brainScoreLeft: {
    alignItems: 'center',
    gap: 5,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    color: '#777',
  },
  brainScoreHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6b6b76',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2a1a00',
    borderWidth: 1,
    borderColor: '#fbbf2455',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakBadgeMuted: {
    opacity: 0.65,
    borderColor: '#fbbf2428',
  },
  streakEmoji: { fontSize: 13 },
  streakCount: { fontSize: 13, fontWeight: '800', color: '#fbbf24' },
  streakSuffix: { fontSize: 11, fontWeight: '700', color: '#c4a01a', marginLeft: 2 },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },

  barSectionCompact: {
    width: 112,
    marginTop: 2,
    alignSelf: 'center',
  },
  barBgSmall: {
    width: '100%',
    height: 3,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFillSmall: {
    height: '100%',
    borderRadius: 2,
  },

  brainCanvasArea: {
    width: '100%',
    maxWidth: '100%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  brainCanvasInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  brainStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '100%',
  },
  levelEmoji: {
    fontSize: 15,
  },
  levelText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    flexShrink: 1,
    textAlign: 'center',
    maxWidth: '100%',
  },

  partnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '100%',
  },
  /** portrait + bubble の隙間（gap は flexBasis:0 列と相性が悪いことがあるため margin で統一） */
  partnerPortraitWrap: {
    flexShrink: 0,
    marginRight: 12,
  },
  /**
   * RN の row 内で flex:1 だけだと flexBasis:auto になり、子テキストの最小幅で列がはみ出す。
   * flexBasis:0 + minWidth:0 で「残り幅」にきっちり収める。
   */
  partnerBubbleOnly: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  partnerBubble: {
    backgroundColor: '#141418',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  partnerNameLine: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  partnerMessageBody: {
    color: '#e4e4ea',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    maxWidth: '100%',
    flexShrink: 1,
  },
  messageLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    maxWidth: '100%',
  },
  messageLoadingText: {
    color: '#666',
    fontSize: 13,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },

  actionBtnFull: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    marginTop: 14,
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
