import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Easing, ScrollView, Dimensions,
  ImageBackground,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { PartnerType, MainTabParamList } from '../types';
import { getNominalDurationSeconds } from '../utils/actionDuration';
import { useHaptics } from '../hooks/useHaptics';
import { LinearGradient } from 'expo-linear-gradient';
import GradientBackground from '../components/GradientBackground';
import BreathingGuide from '../components/BreathingGuide';
import TimerGuide from '../components/TimerGuide';
import BrainRotTestFlow from '../components/BrainRotTestFlow';
import BrainRotTestBlockedMessage from '../components/BrainRotTestBlockedMessage';
import PartnerPortrait from '../components/PartnerPortrait';
import { PARTNER_UI } from '../config/partnerUi';
import { PARTNER_IMAGES_FEEDBACK_FULLBODY } from '../config/partnerAssets';
import { getBrainRotTestEligibility } from '../utils/brainRotTestLimits';
import { useTheme } from '../hooks/useTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** タブバー上端と最下ボタンの間の余白（TabBar 実測高さに加算前の調整済みバッファ） */
const FEEDBACK_FOOTER_GAP_ABOVE_TAB = 10;

/** 完了スコアポップアップの表示時間（フェード含む合計） */
const FEEDBACK_POPUP_TOTAL_MS = 1500;
const FEEDBACK_POPUP_FADE_MS = 180;

type ActionNav = BottomTabNavigationProp<MainTabParamList, 'Action'>;

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((x) => x + x).join('')
    : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getDifficultyColor(diff?: string) {
  if (diff === 'easy')   return '#4ade80';
  if (diff === 'hard')   return '#f87171';
  return '#fbbf24';
}

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
function LoadingView({
  partner,
  showOfflineFallback,
  onPressOffline,
}: {
  partner: PartnerType;
  showOfflineFallback: boolean;
  onPressOffline: (() => void) | null;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const pc = PARTNER_CONFIG[partner];
  const bounce = useRef(new Animated.Value(0)).current;
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const bounceLoop = Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: -14, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0,   duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    bounceLoop.start();
    const dotLoops = dots.map((dot, i) => {
      const loop = Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(dot, { toValue: 1,   duration: 380, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        Animated.delay(540 - i * 180),
      ]));
      loop.start();
      return loop;
    });
    return () => {
      bounceLoop.stop();
      dotLoops.forEach((l) => l.stop());
    };
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <PartnerPortrait
          partner={partner}
          pose="speak"
          size={PARTNER_UI.actionLoadingPortrait}
          borderColor={pc.color}
          borderWidth={3}
        />
      </Animated.View>
      <Text style={[styles.loadingText, { color: pc.color }]}>{t('action.generating')}</Text>
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { backgroundColor: pc.color, opacity: dot }]} />
        ))}
      </View>
      {showOfflineFallback && onPressOffline ? (
        <TouchableOpacity
          style={[styles.offlineFallbackBtn, { borderColor: pc.color + '99', backgroundColor: pc.color + '14' }]}
          onPress={onPressOffline}
          activeOpacity={0.85}
        >
          <Text style={[styles.offlineFallbackBtnText, { color: pc.color }]}>{t('action.offlineFallbackButton')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── 完了フィードバック ────────────────────────────────────────────────
function FeedbackView({
  partner,
  brainScore,
  emphasizeScoreReveal,
  scoreRevealFrom,
  onNext,
  onHome,
  tabBarHeight,
}: {
  partner: PartnerType;
  brainScore: number;
  /** C > A のとき、スコア表示を強調（カウントアップ等） */
  emphasizeScoreReveal: boolean;
  scoreRevealFrom: number | null;
  onNext: (reaction: string | null) => void;
  onHome: () => void;
  tabBarHeight: number;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lastGain = useAppStore((s) => s.lastActionScoreGain);
  const pc = PARTNER_CONFIG[partner];
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [displayTotalScore, setDisplayTotalScore] = useState(brainScore);
  const deltaScale = useRef(new Animated.Value(1)).current;

  const haptics = useHaptics();

  useEffect(() => {
    if (!emphasizeScoreReveal || scoreRevealFrom == null) {
      setDisplayTotalScore(brainScore);
      return;
    }
    void haptics.success();
    const t1 = setTimeout(() => { void haptics.success(); }, 110);
    const t2 = setTimeout(() => { void haptics.warning(); }, 260);
    setDisplayTotalScore(scoreRevealFrom);
    const from = scoreRevealFrom;
    const to = brainScore;
    const durationMs = 950;
    const start = Date.now();
    let rafId = 0;
    const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(p);
      setDisplayTotalScore(Math.round(from + (to - from) * eased));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    Animated.sequence([
      Animated.timing(deltaScale, {
        toValue: 1.22,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(deltaScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [emphasizeScoreReveal, scoreRevealFrom, brainScore, deltaScale, haptics]);
  /* SafeAreaView が底を取るぶん、実タブ縦幅と差し引いて重なりを解消する */
  const footerBottomPad = Math.max(16, tabBarHeight - insets.bottom + FEEDBACK_FOOTER_GAP_ABOVE_TAB);

  const popupOpacity = useRef(new Animated.Value(0)).current;
  const messageFade  = useRef(new Animated.Value(0)).current;
  const btnFade      = useRef(new Animated.Value(0)).current;
  const feedbackOverlayColors =
    theme.id === 'white'
      ? (['rgba(16,20,30,0.22)', 'rgba(16,20,30,0.52)', 'rgba(16,20,30,0.9)'] as const)
      : ([
          hexToRgba(theme.colors.appBg, 0.28),
          hexToRgba(theme.colors.appBg, 0.62),
          hexToRgba(theme.colors.appBg, 0.94),
        ] as const);

  useEffect(() => {
    const holdMs = Math.max(0, FEEDBACK_POPUP_TOTAL_MS - FEEDBACK_POPUP_FADE_MS * 2);
    Animated.sequence([
      Animated.timing(popupOpacity, { toValue: 1, duration: FEEDBACK_POPUP_FADE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(holdMs),
      Animated.timing(popupOpacity, { toValue: 0, duration: FEEDBACK_POPUP_FADE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(messageFade, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(btnFade,     { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, FEEDBACK_POPUP_TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <ImageBackground
      source={PARTNER_IMAGES_FEEDBACK_FULLBODY[partner]}
      style={[styles.feedbackBg, { backgroundColor: theme.colors.appBg }]}
      imageStyle={styles.feedbackBgImage}
      resizeMode="contain"
    >
      <LinearGradient
        colors={feedbackOverlayColors}
        locations={[0, 0.38, 1]}
        style={styles.feedbackGradient}
      >
        <View style={styles.feedbackBodySpacer} />

        <Animated.View style={[styles.feedbackFooter, { paddingBottom: footerBottomPad }]}>
          <Animated.View
            style={[
              styles.feedbackMessageDock,
              {
                opacity: messageFade,
                borderLeftColor: pc.color,
                backgroundColor: hexToRgba(theme.colors.card, 0.86),
                borderColor: hexToRgba(theme.colors.border, 0.9),
              },
            ]}
          >
            <Text style={[styles.feedbackMessageDockLabel, { color: theme.colors.textSubtle }]}>{t('action.feedbackPartnerLine')}</Text>
            <Text style={[styles.feedbackMessageDockText, { color: theme.colors.text }]}>
              {t(`action.feedbackCongrats.${partner}`)}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.reactionSection, styles.feedbackReactionSection, { opacity: messageFade }]}>
            <Text style={[styles.reactionLabel, { color: theme.colors.textMuted }]}>{t('action.reactionLabel')}</Text>
            <View style={styles.reactionRow}>
              {REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[
                    styles.reactionBtn,
                    { backgroundColor: hexToRgba(theme.colors.card, 0.92), borderColor: theme.colors.border },
                    selectedReaction === r.key && styles.reactionBtnActive,
                    selectedReaction === r.key && { borderColor: pc.color, backgroundColor: theme.colors.accentSoft },
                  ]}
                  onPress={() => setSelectedReaction(r.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text
                    style={[
                      styles.reactionText,
                      { color: theme.colors.textMuted },
                      selectedReaction === r.key && { color: pc.color },
                    ]}
                  >
                    {t(`action.${r.key}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.buttonsContainer, styles.feedbackButtonStack, { opacity: btnFade }]}>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: pc.color }]} onPress={() => onNext(selectedReaction)} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{t('action.nextButton')} ⚡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.brainHomeBtn,
                { borderColor: pc.color + '99', backgroundColor: hexToRgba(theme.colors.cardAlt, 0.74) },
              ]}
              onPress={onHome}
              activeOpacity={0.8}
            >
              <Text style={[styles.brainHomeBtnText, { color: pc.color }]}>{t('action.feedbackBrainHomeButton')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.feedbackPopupOverlay, { opacity: popupOpacity }]}
        >
          <View
            style={[
              styles.feedbackPopupCard,
              { borderColor: `${pc.color}44`, backgroundColor: hexToRgba(theme.colors.card, 0.84) },
            ]}
          >
            <Text style={[styles.feedbackPopupTitle, { color: theme.colors.text }]}>{t('action.feedbackTitle')}</Text>
            <Animated.Text
              style={[
                styles.feedbackPopupDelta,
                { color: pc.color },
                emphasizeScoreReveal && { transform: [{ scale: deltaScale }] },
              ]}
            >
              {t('action.feedbackScore', { points: lastGain ?? 0 })}
            </Animated.Text>
            <Text style={[styles.feedbackPopupTotal, { color: theme.colors.textMuted }]}>
              {displayTotalScore}/100
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </ImageBackground>
  );
}

// ── メイン ────────────────────────────────────────────────────────────
export default function ActionScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const navigation = useNavigation<ActionNav>();
  const tabBarHeight = useBottomTabBarHeight();
  const language = useAppStore((s) => s.language);
  const activeActionPlan = useAppStore((s) => s.activeActionPlan);
  const postTestCycle = useAppStore((s) => s.postTestCycle);
  const { selectedPartner, currentAction, isActionLoading, scoreHistory, fetchAction, fetchActionOffline, regenerateActionPlan, completeAction, skipAction, registerActionFeedback } = useAppStore();
  const settledBrainScore = useAppStore((s) => s.brainScore);
  const lastActionFeedbackEmphasized = useAppStore((s) => s.lastActionFeedbackEmphasized);
  const lastActionScoreBefore = useAppStore((s) => s.lastActionScoreBefore);

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];

  type ScreenState = 'action' | 'guide' | 'feedback';
  const [screenState, setScreenState] = useState<ScreenState>('action');
  const [activeTab, setActiveTab]     = useState<'action' | 'test'>('action');
  const [testEligibilityTick, setTestEligibilityTick] = useState(0);
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);
  const haptics   = useHaptics();
  const pagerRef = useRef<ScrollView | null>(null);
  const pagerScrollX = useRef(new Animated.Value(0)).current;
  const lastPagerPage = useRef(0);

  const fireActionCompletionHaptics = useCallback(() => {
    haptics.success();
    setTimeout(() => {
      void haptics.success();
    }, 90);
    setTimeout(() => {
      void haptics.success();
    }, 180);
  }, [haptics]);

  const testEligibility = useMemo(
    () => getBrainRotTestEligibility(scoreHistory, Date.now()),
    [scoreHistory, testEligibilityTick],
  );

  const planProgressLine = useMemo(() => {
    if (!postTestCycle || !activeActionPlan || activeActionPlan.steps.length === 0) return null;
    const total = activeActionPlan.steps.length;
    const current = Math.min(total, activeActionPlan.stepIndex + 1);
    const minutes = Math.max(1, Math.round(activeActionPlan.totalNominalSeconds / 60));
    return t('action.planProgress', { current: String(current), total: String(total), minutes: String(minutes) });
  }, [postTestCycle, activeActionPlan, t]);

  useEffect(() => {
    const id = setInterval(() => setTestEligibilityTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (activeTab === 'test') setTestEligibilityTick((x) => x + 1);
  }, [activeTab]);

  useEffect(() => {
    if (!isActionLoading || currentAction) {
      setShowOfflineFallback(false);
      return;
    }
    const id = setTimeout(() => setShowOfflineFallback(true), 5000);
    return () => clearTimeout(id);
  }, [isActionLoading, currentAction]);

  const onPagerScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.min(1, Math.max(0, Math.round(x / SCREEN_WIDTH)));
      if (page !== lastPagerPage.current) {
        haptics.light();
      }
      lastPagerPage.current = page;
      setActiveTab(page === 0 ? 'action' : 'test');
    },
    [haptics],
  );

  const switchTab = useCallback(
    (tab: 'action' | 'test') => {
      if (tab === activeTab) return;
      const page = tab === 'action' ? 0 : 1;
      lastPagerPage.current = page;
      setActiveTab(tab);
      pagerRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
      haptics.light();
    },
    [activeTab, haptics],
  );

  const handleTestComplete = (delta: number) => {
    useAppStore.getState().applyTestResult(delta);
    useAppStore.getState().markTestDone();
    switchTab('action');
    // useFocusEffect は同一画面内のタブ切替で再発火しないため、明示的に取得を開始する
    void fetchAction();
  };

  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const prevLanguageRef = useRef<string | null>(null);

  /** 言語切替でガイド／完了画面に残らないようメイン提案画面に戻す（再取得は setLanguage 側） */
  useEffect(() => {
    if (prevLanguageRef.current === null) {
      prevLanguageRef.current = language;
      return;
    }
    if (prevLanguageRef.current === language) return;
    prevLanguageRef.current = language;
    setScreenState('action');
  }, [language]);

  // 画面フォーカス時にアクションがなければ自動取得
  // 注: store の最新状態を直接参照することで deps の stale closure を回避
  useFocusEffect(useCallback(() => {
    const s = useAppStore.getState();
    if (!s.currentAction && !s.isActionLoading && screenState === 'action') {
      fetchAction();
    }
  }, [screenState, fetchAction]));

  useFocusEffect(
    useCallback(() => {
      if (screenState === 'feedback' || screenState === 'guide') return;
      const x = activeTab === 'action' ? 0 : SCREEN_WIDTH;
      lastPagerPage.current = activeTab === 'action' ? 0 : 1;
      requestAnimationFrame(() => {
        pagerRef.current?.scrollTo({ x, animated: false });
        pagerScrollX.setValue(x);
      });
    }, [activeTab, screenState, pagerScrollX]),
  );

  useEffect(() => {
    if (currentAction) {
      cardOpacity.setValue(0);
      cardTranslateY.setValue(30);
      setScreenState('action');
      Animated.parallel([
        Animated.timing(cardOpacity,    { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [currentAction]);

  const handleComplete = () => {
    const before = useAppStore.getState();
    const action = before.currentAction;
    const sec = action ? getNominalDurationSeconds(action) : 180;
    const plan = before.activeActionPlan;
    const inPlan = !!(before.postTestCycle && plan && action && plan.steps[plan.stepIndex]?.baseId === action.baseId);
    const isLastPlanStep = inPlan && plan && plan.stepIndex >= plan.steps.length - 1;

    if (inPlan && !isLastPlanStep) {
      void haptics.medium();
    } else {
      fireActionCompletionHaptics();
    }
    completeAction({ actualDurationSeconds: sec });
    const after = useAppStore.getState();
    if (after.currentAction) {
      setScreenState('action');
      return;
    }
    setScreenState('feedback');
  };

  const handleGuideComplete = (activeSeconds: number) => {
    const before = useAppStore.getState();
    const action = before.currentAction;
    const plan = before.activeActionPlan;
    const inPlan = !!(before.postTestCycle && plan && action && plan.steps[plan.stepIndex]?.baseId === action.baseId);
    const isLastPlanStep = inPlan && plan && plan.stepIndex >= plan.steps.length - 1;

    if (inPlan && !isLastPlanStep) {
      void haptics.medium();
    } else {
      fireActionCompletionHaptics();
    }
    completeAction({ actualDurationSeconds: activeSeconds });
    const after = useAppStore.getState();
    if (after.currentAction) {
      setScreenState('action');
      return;
    }
    setScreenState('feedback');
  };

  const handleGuideSkip = (activeSeconds: number) => {
    const before = useAppStore.getState();
    const action = before.currentAction;
    const plan = before.activeActionPlan;
    const inPlan = !!(before.postTestCycle && plan && action && plan.steps[plan.stepIndex]?.baseId === action.baseId);
    const isLastPlanStep = inPlan && plan && plan.stepIndex >= plan.steps.length - 1;

    if (inPlan && !isLastPlanStep) {
      void haptics.medium();
    } else {
      fireActionCompletionHaptics();
    }
    completeAction({ actualDurationSeconds: activeSeconds });
    const after = useAppStore.getState();
    if (after.currentAction) {
      setScreenState('action');
      return;
    }
    setScreenState('feedback');
  };

  const handleGuideCancel = () => {
    haptics.light();
    setScreenState('action');
  };

  const handleStartGuide = () => {
    haptics.medium();
    setScreenState('guide');
  };

  const handleSkip = () => {
    haptics.light();
    const before = useAppStore.getState();
    const wasPlan = !!(before.postTestCycle && before.activeActionPlan);
    skipAction();
    const after = useAppStore.getState();
    if (after.currentAction) return;
    if (wasPlan && !after.postTestCycle) {
      setScreenState('feedback');
      return;
    }
    fetchAction();
  };

  const handleNext = (reaction: string | null) => {
    registerActionFeedback(reaction);
    haptics.medium();
    setScreenState('action');
    fetchAction();
  };

  const handleHome = () => {
    haptics.light();
    setScreenState('action');
    navigation.navigate('Home');
  };

  return (
    <GradientBackground variant="action">
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />

      {/* タブバー */}
      {screenState !== 'feedback' && (
        <View style={[styles.tabBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {(['action', 'test'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => switchTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: theme.colors.textSubtle },
                  activeTab === tab && styles.tabLabelActive,
                  activeTab === tab && { color: theme.colors.accentText },
                ]}
              >
                {tab === 'action' ? t('action.title') : t('brainRotTest.tabLabel')}
              </Text>
            </TouchableOpacity>
          ))}
          <Animated.View style={[
            styles.tabUnderline,
            { backgroundColor: theme.colors.accent },
            { width: (SCREEN_WIDTH - 44) / 2 },
            {
              transform: [{
                translateX: pagerScrollX.interpolate({
                  inputRange: [0, SCREEN_WIDTH],
                  outputRange: [0, (SCREEN_WIDTH - 44) / 2],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]} />
        </View>
      )}

      {screenState === 'feedback' ? (
        <FeedbackView
          partner={partner}
          brainScore={settledBrainScore}
          emphasizeScoreReveal={lastActionFeedbackEmphasized}
          scoreRevealFrom={lastActionScoreBefore}
          onNext={handleNext}
          onHome={handleHome}
          tabBarHeight={tabBarHeight}
        />
      ) : screenState === 'guide' && currentAction ? (
        currentAction.interactiveType === 'breathing' && currentAction.breathingConfig ? (
          <BreathingGuide
            config={currentAction.breathingConfig}
            partnerColor={pc.color}
            onComplete={handleGuideComplete}
            onSkip={handleGuideSkip}
            onCancel={handleGuideCancel}
          />
        ) : currentAction.interactiveType === 'timer' && currentAction.timerConfig ? (
          <TimerGuide
            config={currentAction.timerConfig}
            partnerColor={pc.color}
            actionTitle={currentAction.title}
            onComplete={handleGuideComplete}
            onSkip={handleGuideSkip}
            onCancel={handleGuideCancel}
          />
        ) : null
      ) : (
        <Animated.ScrollView
          ref={pagerRef}
          style={styles.actionPager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: pagerScrollX } } }],
            { useNativeDriver: false },
          )}
          onMomentumScrollEnd={onPagerScrollEnd}
        >
          <View style={[styles.actionPagerPage, { width: SCREEN_WIDTH }]}>
            {screenState === 'action' && activeTab === 'action' && (
              <View style={styles.actionHeader}>
                {!isActionLoading && (
                  <TouchableOpacity
                    onPress={() => {
                      haptics.medium();
                      if (postTestCycle && activeActionPlan) {
                        void regenerateActionPlan();
                      } else {
                        void fetchAction();
                      }
                    }}
                    style={styles.refreshBtn}
                  >
                    <Text style={styles.refreshIcon}>🔄</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {isActionLoading ? (
              <LoadingView
                partner={partner}
                showOfflineFallback={showOfflineFallback}
                onPressOffline={showOfflineFallback ? () => {
                  haptics.medium();
                  fetchActionOffline();
                } : null}
              />
            ) : currentAction ? (
              <ScrollView
                style={styles.resultScroll}
                contentContainerStyle={styles.resultContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {currentAction.isOffline && (
                  <View style={[styles.offlineBadge, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                    <Text style={[styles.offlineBadgeText, { color: theme.colors.textSubtle }]}>{t('action.offlineMode')}</Text>
                  </View>
                )}
                {planProgressLine ? (
                  <View style={[styles.planProgressBadge, { backgroundColor: hexToRgba(pc.color, 0.12), borderColor: hexToRgba(pc.color, 0.35) }]}>
                    <Text style={[styles.planProgressText, { color: pc.color }]}>{planProgressLine}</Text>
                  </View>
                ) : null}

                <Animated.View style={[styles.actionCard, { borderColor: pc.color + '55', backgroundColor: theme.colors.card },
                  { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.durationBadge, { backgroundColor: pc.color + '22', borderColor: pc.color + '55' }]}>
                      <Text style={[styles.durationText, { color: pc.color }]}>⏱ {currentAction.duration}</Text>
                    </View>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(currentAction.difficulty) + '22', borderColor: getDifficultyColor(currentAction.difficulty) + '55' }]}>
                      <Text style={[styles.durationText, { color: getDifficultyColor(currentAction.difficulty) }]}>
                        {t(`action.difficulty.${currentAction.difficulty}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{currentAction.title}</Text>
                  <Text style={[styles.actionDescription, { color: theme.colors.textMuted }]}>{currentAction.description}</Text>
                </Animated.View>

                <Animated.View style={[styles.partnerRow, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
                  <PartnerPortrait
                    partner={partner}
                    pose="speak"
                    size={PARTNER_UI.actionBubblePortrait}
                    borderColor={pc.color}
                    borderWidth={3}
                  />
                  <View style={styles.partnerBubbleWrapper}>
                    <View style={[styles.bubbleTail, { borderRightColor: pc.color + '55' }]} />
                    <View style={[styles.partnerBubble, { borderColor: pc.color + '44', backgroundColor: theme.colors.cardAlt }]}>
                      <Text style={[styles.partnerMessageText, { color: pc.color }]}>
                        {currentAction.partnerMessage}
                      </Text>
                    </View>
                  </View>
                </Animated.View>

                <Animated.View style={[styles.buttonsContainer, { opacity: cardOpacity }]}>
                  {currentAction.interactiveType !== 'none' && (
                    <TouchableOpacity
                      style={[styles.guideBtn, { borderColor: pc.color + '88', backgroundColor: pc.color + '15' }]}
                      onPress={handleStartGuide}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.guideBtnText, { color: pc.color }]}>{t('action.startGuide')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.completeBtn,
                      {
                        backgroundColor: currentAction.interactiveType !== 'none' ? theme.colors.cardAlt : pc.color,
                        borderWidth: currentAction.interactiveType !== 'none' ? 1 : 0,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={handleComplete}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.completeBtnText,
                        { color: currentAction.interactiveType !== 'none' ? theme.colors.textSubtle : '#000' },
                      ]}
                    >
                      {t('action.completeButton')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                    <Text style={[styles.skipBtnText, { color: theme.colors.textSubtle }]}>{t('action.skipButton')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </ScrollView>
            ) : null}
          </View>

          <View style={[styles.actionPagerPage, { width: SCREEN_WIDTH }]}>
            {testEligibility.ok ? (
              <BrainRotTestFlow
                onComplete={handleTestComplete}
                onSkip={() => switchTab('action')}
                showSkipButton
                showBadge={false}
              />
            ) : (
              <BrainRotTestBlockedMessage
                reason={testEligibility.reason}
                nextAllowedAt={testEligibility.nextAllowedAt}
                onDismiss={() => switchTab('action')}
              />
            )}
          </View>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  actionPager: { flex: 1 },
  actionPagerPage: { flex: 1 },

  /* 内部タブバー */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    position: 'relative',
    overflow: 'hidden',
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
  tabLabelActive: { color: '#a78bfa' },
  tabUnderline: {
    position: 'absolute', bottom: 0, height: 2,
    backgroundColor: '#a78bfa', borderRadius: 1,
  },

  actionHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 4, paddingBottom: 4 },
  refreshBtn: { padding: 6 },
  refreshIcon: { fontSize: 20 },

  /* ローディング */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28 },
  loadingText: { fontSize: 16, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  offlineFallbackBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  offlineFallbackBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* 結果カード */
  resultScroll: { flex: 1 },
  resultContainer: { paddingHorizontal: 22, paddingBottom: 32, gap: 18 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  difficultyBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  offlineBadge: { alignSelf: 'flex-start', backgroundColor: '#222', borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  offlineBadgeText: { color: '#666', fontSize: 12, fontWeight: '600' },
  planProgressBadge: { alignSelf: 'stretch', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  planProgressText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  actionCard: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 14 },
  durationBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  durationText: { fontSize: 13, fontWeight: '700' },
  actionTitle: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 36 },
  actionDescription: { fontSize: 15, color: '#ccc', lineHeight: 24 },

  /* パートナー吹き出し */
  partnerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  partnerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a1a1a', borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  partnerAvatarEmoji: { fontSize: 24 },
  partnerBubbleWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 0, paddingTop: 4 },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 7, borderTopColor: 'transparent', borderBottomWidth: 7, borderBottomColor: 'transparent', borderRightWidth: 10, flexShrink: 0 },
  partnerBubble: { flex: 1, backgroundColor: '#161616', borderWidth: 1, borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 13 },
  partnerMessageText: { fontSize: 15, fontWeight: '700', lineHeight: 22, fontStyle: 'italic' },

  /* ボタン */
  buttonsContainer: { gap: 12, marginTop: 4 },
  guideBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1 },
  guideBtnText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  completeBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  completeBtnText: { color: '#000', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },

  /* フィードバック（全画面背景＋全身用プレースホルダー画像） */
  feedbackBg: { flex: 1, width: '100%', backgroundColor: '#0d0d0d' },
  feedbackBgImage: {
    width: '100%',
    height: '100%',
  },
  feedbackGradient: { flex: 1 },
  feedbackBodySpacer: { flex: 1, minHeight: 24 },
  feedbackMessageDock: {
    alignSelf: 'stretch',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(10,10,14,0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderLeftWidth: 3,
    marginBottom: 14,
  },
  feedbackMessageDockLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(200,200,210,0.85)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  feedbackMessageDockText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  feedbackPopupOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 28,
  },
  feedbackPopupCard: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: 18,
    backgroundColor: 'rgba(14,14,18,0.78)',
    borderWidth: 1,
    maxWidth: 300,
    width: '100%',
  },
  feedbackPopupTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  feedbackPopupDelta: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  feedbackPopupTotal: {
    fontSize: 15,
    color: 'rgba(210,210,220,0.95)',
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 0,
  },
  /* リアクション */
  reactionSection: { gap: 12, marginTop: 22 },
  feedbackReactionSection: { marginTop: 0 },
  reactionLabel: { fontSize: 14, fontWeight: '700', color: '#d0d0d0', textAlign: 'center', paddingHorizontal: 4 },
  reactionRow: { flexDirection: 'row', gap: 10 },
  reactionBtn: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(22,22,22,0.92)', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 14, paddingVertical: 12, gap: 4 },
  reactionBtnActive: { backgroundColor: '#1e1433' },
  reactionEmoji: { fontSize: 24 },
  reactionText: { fontSize: 12, fontWeight: '600', color: '#b0b0b0' },

  /* 次へ・ホーム（フィードバック） */
  nextBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  nextBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
  brainHomeBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  brainHomeBtnText: { fontSize: 16, fontWeight: '800' },
  feedbackButtonStack: { marginTop: 14 },
});
