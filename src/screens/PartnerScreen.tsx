import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { PartnerType, RootStackParamList } from '../types';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  getExpoPushToken,
} from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'PartnerResult'>;

const PARTNER_CONFIG: Record<
  PartnerType,
  { emoji: string; color: string; bgColor: string; borderColor: string }
> = {
  teacher:   { emoji: '🎯', color: '#f87171', bgColor: '#2a1010', borderColor: '#f8717144' },
  counselor: { emoji: '🌸', color: '#f9a8d4', bgColor: '#2a1020', borderColor: '#f9a8d444' },
  scientist: { emoji: '🔬', color: '#67e8f9', bgColor: '#0a2030', borderColor: '#67e8f944' },
  trainer:   { emoji: '💪', color: '#fbbf24', bgColor: '#2a1a00', borderColor: '#fbbf2444' },
};

export default function PartnerScreen({ route }: Props) {
  const { t } = useI18n();
  const { setOnboardingComplete, setNotificationsEnabled, setReminderTime, brainScore, reminderHour, reminderMinute } = useAppStore();

  const handleStart = async () => {
    // 通知権限をリクエスト（診断完了のポジティブな瞬間に聞く）
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
      await scheduleDailyReminder(reminderHour, reminderMinute, partner);
      await getExpoPushToken(); // 将来のFirebase連携用にトークン取得
    }
    setOnboardingComplete(true);
    // Firebase にプロフィールを同期
    await useAppStore.getState().syncProfile();
  };
  const { partner } = route.params;
  const config = PARTNER_CONFIG[partner];

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;
  const emojiScale = useRef(new Animated.Value(0.5)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1, duration: 450,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0, duration: 450,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(emojiScale, {
        toValue: 1, delay: 150,
        damping: 14, stiffness: 120, useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1, duration: 350, useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0, duration: 350,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]).start();
    }, 700);
  }, []);

  const getScoreStatus = (score: number) => {
    if (score >= 70) return { label: t('home.statusHealthy'), color: '#4ade80' };
    if (score >= 40) return { label: t('home.statusWarning'), color: '#fbbf24' };
    return { label: t('home.statusCritical'), color: '#f87171' };
  };

  const status = getScoreStatus(brainScore);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        <Text style={styles.resultTitle}>{t('partner.resultTitle')}</Text>

        {/* パートナーカード */}
        <View style={[styles.partnerCard, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
          <Animated.Text style={[styles.partnerEmoji, { transform: [{ scale: emojiScale }] }]}>
            {config.emoji}
          </Animated.Text>
          <Text style={[styles.partnerName, { color: config.color }]}>
            {t(`partner.${partner}.name`)}
          </Text>
          <Text style={styles.partnerDescription}>
            {t(`partner.${partner}.description`)}
          </Text>
          <View style={[styles.catchphraseBox, { borderColor: config.borderColor }]}>
            <Text style={[styles.catchphrase, { color: config.color }]}>
              {t(`partner.${partner}.catchphrase`)}
            </Text>
          </View>
        </View>

        {/* 初期スコア */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreTitle}>{t('partner.brainScoreLabel')}</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>{brainScore}</Text>
            <Text style={[styles.scoreStatus, { color: status.color }]}>{status.label}</Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View
              style={[styles.scoreBarFill, { width: `${brainScore}%`, backgroundColor: status.color }]}
            />
          </View>
        </View>
      </Animated.View>

      {/* スタートボタン */}
      <Animated.View
        style={[
          styles.buttonContainer,
          { opacity: buttonOpacity, transform: [{ translateY: buttonTranslateY }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: config.color }]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>{t('partner.startButton')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  partnerCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  partnerEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  partnerName: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  partnerDescription: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  catchphraseBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  catchphrase: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  scoreContainer: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
  },
  scoreTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
  },
  scoreStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreBarBg: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  startButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
