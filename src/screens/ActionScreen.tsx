import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Easing, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { PartnerType, MainTabParamList } from '../types';

type ActionNav = BottomTabNavigationProp<MainTabParamList, 'Action'>;

const PARTNER_CONFIG: Record<PartnerType, { emoji: string; color: string; bgColor: string }> = {
  teacher:   { emoji: '🎯', color: '#f87171', bgColor: '#2a1010' },
  counselor: { emoji: '🌸', color: '#f9a8d4', bgColor: '#2a1020' },
  scientist: { emoji: '🔬', color: '#67e8f9', bgColor: '#0a2030' },
  trainer:   { emoji: '💪', color: '#fbbf24', bgColor: '#2a1a00' },
};

const REACTIONS = [
  { key: 'reactionGreat', emoji: '😊' },
  { key: 'reactionOk',    emoji: '😐' },
  { key: 'reactionHard',  emoji: '😓' },
];

// ── ローディング ──────────────────────────────────────────────────────
function LoadingView({ partner }: { partner: PartnerType }) {
  const { t } = useI18n();
  const pc = PARTNER_CONFIG[partner];
  const bounce = useRef(new Animated.Value(0)).current;
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: -14, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0,   duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    dots.forEach((dot, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(dot, { toValue: 1,   duration: 380, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        Animated.delay(540 - i * 180),
      ])).start();
    });
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingAvatar, { borderColor: pc.color + '66', transform: [{ translateY: bounce }] }]}>
        <Text style={styles.loadingEmoji}>{pc.emoji}</Text>
      </Animated.View>
      <Text style={[styles.loadingText, { color: pc.color }]}>{t('action.generating')}</Text>
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { backgroundColor: pc.color, opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

// ── 完了フィードバック ────────────────────────────────────────────────
function FeedbackView({
  partner, brainScore, onNext, onHome,
}: { partner: PartnerType; brainScore: number; onNext: () => void; onHome: () => void }) {
  const { t } = useI18n();
  const pc = PARTNER_CONFIG[partner];
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const scoreAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.5)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const btnFade    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 350, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.feedbackContainer}>
      {/* スコア演出 */}
      <Animated.View style={[styles.feedbackScoreBox, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
        <Text style={styles.feedbackEmoji}>🎉</Text>
        <Text style={[styles.feedbackScoreDelta, { color: pc.color }]}>{t('action.feedbackScore')}</Text>
        <Text style={styles.feedbackScoreTotal}>{brainScore}/100</Text>
        <Text style={styles.feedbackTitle}>{t('action.feedbackTitle')}</Text>
      </Animated.View>

      {/* パートナーの一言 */}
      <Animated.View style={[styles.partnerRow, { opacity: fadeAnim }]}>
        <View style={[styles.partnerAvatar, { borderColor: pc.color + '66' }]}>
          <Text style={styles.partnerAvatarEmoji}>{pc.emoji}</Text>
        </View>
        <View style={styles.partnerBubbleWrapper}>
          <View style={[styles.bubbleTail, { borderRightColor: pc.color + '55' }]} />
          <View style={[styles.partnerBubble, { borderColor: pc.color + '44' }]}>
            <Text style={[styles.partnerMessageText, { color: pc.color }]}>
              {t(`action.feedbackCongrats.${partner}`)}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* リアクション */}
      <Animated.View style={[styles.reactionSection, { opacity: fadeAnim }]}>
        <Text style={styles.reactionLabel}>{t('action.reactionLabel')}</Text>
        <View style={styles.reactionRow}>
          {REACTIONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reactionBtn, selectedReaction === r.key && styles.reactionBtnActive, selectedReaction === r.key && { borderColor: pc.color }]}
              onPress={() => setSelectedReaction(r.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={[styles.reactionText, selectedReaction === r.key && { color: pc.color }]}>{t(r.key)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ボタン */}
      <Animated.View style={[styles.buttonsContainer, { opacity: btnFade }]}>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: pc.color }]} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{t('action.nextButton')} ⚡</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={onHome} activeOpacity={0.7}>
          <Text style={styles.homeBtnText}>{t('action.homeButton')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── メイン ────────────────────────────────────────────────────────────
export default function ActionScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<ActionNav>();
  const { selectedPartner, currentAction, isActionLoading, brainScore, fetchAction, completeAction, skipAction } = useAppStore();

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];

  const [showFeedback, setShowFeedback] = useState(false);

  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;

  // 画面フォーカス時にアクションがなければ自動取得
  useFocusEffect(useCallback(() => {
    if (!currentAction && !isActionLoading && !showFeedback) {
      fetchAction();
    }
  }, []));

  useEffect(() => {
    if (currentAction) {
      cardOpacity.setValue(0);
      cardTranslateY.setValue(30);
      Animated.parallel([
        Animated.timing(cardOpacity,    { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [currentAction]);

  const handleComplete = () => {
    completeAction();
    setShowFeedback(true);
  };

  const handleSkip = () => {
    skipAction();
    fetchAction();
  };

  const handleNext = () => {
    setShowFeedback(false);
    fetchAction();
  };

  const handleHome = () => {
    setShowFeedback(false);
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      {/* ヘッダー */}
      {!showFeedback && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('action.title')}</Text>
          {!isActionLoading && (
            <TouchableOpacity onPress={fetchAction} style={styles.refreshBtn}>
              <Text style={styles.refreshIcon}>🔄</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* コンテンツ切り替え */}
      {showFeedback ? (
        <FeedbackView partner={partner} brainScore={brainScore} onNext={handleNext} onHome={handleHome} />
      ) : isActionLoading ? (
        <LoadingView partner={partner} />
      ) : currentAction ? (
        <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
          {currentAction.isOffline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>📡 オフラインモード</Text>
            </View>
          )}

          {/* アクションカード */}
          <Animated.View style={[styles.actionCard, { borderColor: pc.color + '55', backgroundColor: pc.bgColor },
            { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
            <View style={[styles.durationBadge, { backgroundColor: pc.color + '22', borderColor: pc.color + '55' }]}>
              <Text style={[styles.durationText, { color: pc.color }]}>⏱ {currentAction.duration}</Text>
            </View>
            <Text style={styles.actionTitle}>{currentAction.title}</Text>
            <Text style={styles.actionDescription}>{currentAction.description}</Text>
          </Animated.View>

          {/* パートナーの一言 */}
          <Animated.View style={[styles.partnerRow, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
            <View style={[styles.partnerAvatar, { borderColor: pc.color + '66' }]}>
              <Text style={styles.partnerAvatarEmoji}>{pc.emoji}</Text>
            </View>
            <View style={styles.partnerBubbleWrapper}>
              <View style={[styles.bubbleTail, { borderRightColor: pc.color + '55' }]} />
              <View style={[styles.partnerBubble, { borderColor: pc.color + '44' }]}>
                <Text style={[styles.partnerMessageText, { color: pc.color }]}>
                  {currentAction.partnerMessage}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ボタン */}
          <Animated.View style={[styles.buttonsContainer, { opacity: cardOpacity }]}>
            <TouchableOpacity style={[styles.completeBtn, { backgroundColor: pc.color }]} onPress={handleComplete} activeOpacity={0.85}>
              <Text style={styles.completeBtnText}>{t('action.completeButton')} +5pt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>{t('action.skipButton')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  refreshBtn: { padding: 6 },
  refreshIcon: { fontSize: 20 },

  /* ローディング */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loadingAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1a1a1a', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  loadingEmoji: { fontSize: 44 },
  loadingText: { fontSize: 16, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  /* 結果カード */
  resultContainer: { paddingHorizontal: 22, paddingBottom: 32, gap: 18 },
  offlineBadge: { alignSelf: 'flex-start', backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  offlineBadgeText: { color: '#666', fontSize: 12, fontWeight: '600' },
  actionCard: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 14 },
  durationBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  durationText: { fontSize: 13, fontWeight: '700' },
  actionTitle: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 36 },
  actionDescription: { fontSize: 15, color: '#ccc', lineHeight: 24 },

  /* パートナー吹き出し */
  partnerRow: { flexDirection: 'row', alignItems: 'center' },
  partnerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a1a1a', borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  partnerAvatarEmoji: { fontSize: 24 },
  partnerBubbleWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 7, borderTopColor: 'transparent', borderBottomWidth: 7, borderBottomColor: 'transparent', borderRightWidth: 10, flexShrink: 0 },
  partnerBubble: { flex: 1, backgroundColor: '#161616', borderWidth: 1, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11 },
  partnerMessageText: { fontSize: 14, fontWeight: '700', lineHeight: 21, fontStyle: 'italic' },

  /* ボタン */
  buttonsContainer: { gap: 12, marginTop: 4 },
  completeBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  completeBtnText: { color: '#000', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },

  /* フィードバック */
  feedbackContainer: { flex: 1, paddingHorizontal: 22, paddingBottom: 24, justifyContent: 'space-between' },
  feedbackScoreBox: { alignItems: 'center', paddingTop: 24, gap: 6 },
  feedbackEmoji: { fontSize: 56 },
  feedbackScoreDelta: { fontSize: 40, fontWeight: '900' },
  feedbackScoreTotal: { fontSize: 16, color: '#666', fontWeight: '600' },
  feedbackTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4 },

  /* リアクション */
  reactionSection: { gap: 12 },
  reactionLabel: { fontSize: 13, fontWeight: '700', color: '#666', textAlign: 'center' },
  reactionRow: { flexDirection: 'row', gap: 10 },
  reactionBtn: { flex: 1, alignItems: 'center', backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 14, paddingVertical: 12, gap: 4 },
  reactionBtnActive: { backgroundColor: '#1e1433' },
  reactionEmoji: { fontSize: 24 },
  reactionText: { fontSize: 12, fontWeight: '600', color: '#555' },

  /* 次へ・ホームボタン */
  nextBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  nextBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
  homeBtn: { alignItems: 'center', paddingVertical: 12 },
  homeBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },
});
