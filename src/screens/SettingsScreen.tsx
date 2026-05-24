import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { Language, PartnerType, ReminderTime, RootStackParamList } from '../types';
import {
  requestNotificationPermission,
  scheduleDailyReminders,
  cancelAllNotifications,
  sendTestNotification,
} from '../services/notificationService';
import PartnerPortrait from '../components/PartnerPortrait';
import { PARTNER_UI } from '../config/partnerUi';
import { getPrivacyPolicyUrl, getTermsOfServiceUrl } from '../config/legalUrls';
import { useTheme } from '../hooks/useTheme';
import { useEffectiveBrainScore } from '../hooks/useEffectiveBrainScore';

const PARTNER_CONFIG: Record<PartnerType, { emoji: string; color: string }> = {
  teacher:   { emoji: '🎯', color: '#f87171' },
  counselor: { emoji: '🌸', color: '#f9a8d4' },
  scientist: { emoji: '🔬', color: '#67e8f9' },
  trainer:   { emoji: '💪', color: '#fbbf24' },
};

const LANGUAGES: { code: Language; key: string; flag: string }[] = [
  { code: 'ja', key: 'settings.langJa', flag: '🇯🇵' },
  { code: 'en', key: 'settings.langEn', flag: '🇺🇸' },
  { code: 'th', key: 'settings.langTh', flag: '🇹🇭' },
];

export default function SettingsScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const navigation = useNavigation();
  const {
    selectedPartner,
    language,
    notificationsEnabled,
    reminderTimes,
    themeName,
    setOnboardingComplete,
    setSelectedPartner,
    setPartnerQuizOnly,
    setNotificationsEnabled,
    setReminderTimes,
  } = useAppStore();
  const brainScore = useEffectiveBrainScore();
  const [pickerTime, setPickerTime] = useState(() => {
    const base = new Date();
    base.setHours(21, 0, 0, 0);
    return base;
  });

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];

  const currentLanguage = useMemo(
    () => LANGUAGES.find((x) => x.code === language) ?? LANGUAGES[0],
    [language],
  );
  const currentThemeLabel = useMemo(
    () => t(`settings.theme${themeName.charAt(0).toUpperCase()}${themeName.slice(1)}`),
    [t, themeName],
  );
  const sortedReminderTimes = useMemo(
    () => [...reminderTimes].sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute)),
    [reminderTimes],
  );

  const formatTime = (hour: number, minute: number): string => {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleChangePartner = () => {
    setPartnerQuizOnly(true);
    setOnboardingComplete(false);
    setSelectedPartner(null);
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('', t('notifications.permissionDenied'));
        return;
      }
      const nextTimes = reminderTimes.length > 0 ? reminderTimes : [{ hour: 21, minute: 0 }];
      if (reminderTimes.length === 0) {
        setReminderTimes(nextTimes);
      }
      setNotificationsEnabled(true);
      await scheduleDailyReminders(nextTimes, partner);
    } else {
      setNotificationsEnabled(false);
      await cancelAllNotifications();
    }
  };

  const handlePickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    setPickerTime(date);
  };

  const handleAddReminderTime = async () => {
    const pickerHour = pickerTime.getHours();
    const pickerMinute = pickerTime.getMinutes();
    const candidate: ReminderTime = { hour: pickerHour, minute: pickerMinute };
    const key = `${candidate.hour}:${candidate.minute}`;
    if (reminderTimes.some((time) => `${time.hour}:${time.minute}` === key)) return;
    const nextTimes = [...reminderTimes, candidate].sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
    setReminderTimes(nextTimes);
    if (notificationsEnabled) {
      await scheduleDailyReminders(nextTimes, partner);
    }
  };

  const handleRemoveReminderTime = async (target: ReminderTime) => {
    const nextTimes = reminderTimes.filter((time) => !(time.hour === target.hour && time.minute === target.minute));
    setReminderTimes(nextTimes);
    if (notificationsEnabled) {
      await scheduleDailyReminders(nextTimes, partner);
    }
  };

  const handleReset = () => {
    const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    parent?.navigate('DataResetConfirm');
  };

  /** 外部ブラウザでリンクを開く（プライバシーポリシー・利用規約用） */
  const openExternalUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('settings.openLinkErrorTitle'), t('settings.openLinkErrorMessage'));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.openLinkErrorTitle'), t('settings.openLinkErrorMessage'));
    }
  };

  const handleOpenPrivacyPolicy = () => {
    void openExternalUrl(getPrivacyPolicyUrl(language));
  };

  const handleOpenTermsOfService = () => {
    void openExternalUrl(getTermsOfServiceUrl(language));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.appBg }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.colors.appBg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{t('settings.title')}</Text>

        {/* ── パートナーセクション ── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('settings.sectionPartner')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>

          {/* 現在のパートナー表示 */}
          <View style={styles.partnerRow}>
            <PartnerPortrait
              partner={partner}
              pose="idle"
              size={PARTNER_UI.settingsPortrait}
              borderColor={pc.color}
              borderWidth={3}
            />
            <View style={styles.partnerInfo}>
              <Text style={[styles.partnerInfoLabel, { color: theme.colors.textSubtle }]}>{t('settings.currentPartner')}</Text>
              <Text style={[styles.partnerName, { color: pc.color }]}>
                {t(`partner.${partner}.name`)}
              </Text>
            </View>
            <View style={[styles.scorePill, { borderColor: pc.color + '55' }]}>
              <Text style={[styles.scorePillText, { color: pc.color }]}>{brainScore}pt</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* パートナー変更ボタン */}
          <TouchableOpacity style={styles.rowButton} onPress={handleChangePartner} activeOpacity={0.7}>
            <View>
              <Text style={[styles.rowButtonTitle, { color: theme.colors.text }]}>{t('settings.changePartner')}</Text>
              <Text style={[styles.rowButtonDesc, { color: theme.colors.textSubtle }]}>{t('settings.changePartnerDesc')}</Text>
            </View>
            <Text style={[styles.rowButtonArrow, { color: theme.colors.textSubtle }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('settings.sectionTheme')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.rowButton}
            activeOpacity={0.75}
            onPress={() => {
              const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
              parent?.navigate('ThemeSelect');
            }}
          >
            <Text style={[styles.rowButtonTitle, { color: theme.colors.text }]}>{currentThemeLabel}</Text>
            <Text style={[styles.rowButtonArrow, { color: theme.colors.textSubtle }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 言語セクション ── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('settings.sectionLanguage')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.langRow}
            onPress={() => {
              const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
              parent?.navigate('LanguageSelect');
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.langFlag}>{currentLanguage.flag}</Text>
            <Text style={[styles.langLabel, { color: theme.colors.text }]}>{t(currentLanguage.key)}</Text>
            <Text style={[styles.rowButtonArrow, { color: theme.colors.textSubtle }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 通知セクション ── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('notifications.sectionTitle')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* 通知オン/オフ */}
          <View style={styles.switchRow}>
            <Text style={[styles.rowButtonTitle, { color: theme.colors.text }]}>{t('notifications.enableToggle')}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={notificationsEnabled ? '#fff' : theme.colors.textSubtle}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              {/* リマインド時間選択 */}
              <View style={styles.timeSectionInner}>
                <Text style={[styles.timeLabel, { color: theme.colors.textSubtle }]}>{t('notifications.reminderTime')}</Text>
                <View style={styles.timeGrid}>
                  {sortedReminderTimes.map((time) => (
                    <View
                      key={`${time.hour}:${time.minute}`}
                      style={[styles.timeChip, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}
                    >
                      <Text style={[styles.timeChipText, { color: theme.colors.textMuted }]}>
                        {formatTime(time.hour, time.minute)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveReminderTime(time)}
                        hitSlop={8}
                        style={styles.timeChipRemoveButton}
                      >
                        <Text style={[styles.timeChipRemoveText, { color: theme.colors.textSubtle }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {sortedReminderTimes.length === 0 ? (
                    <Text style={[styles.emptyReminderText, { color: theme.colors.textSubtle }]}>
                      {t('notifications.noReminderTimes')}
                    </Text>
                  ) : null}
                </View>

                <View style={[styles.wheelPickerCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                  <DateTimePicker
                    style={styles.wheelPicker}
                    value={pickerTime}
                    mode="time"
                    display="spinner"
                    is24Hour
                    onChange={handlePickerChange}
                    {...(Platform.OS === 'ios'
                      ? {
                        textColor: theme.colors.text,
                        themeVariant: theme.id === 'white' ? 'light' : 'dark' as const,
                      }
                      : {})}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.addReminderBtn, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}
                  onPress={handleAddReminderTime}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.addReminderBtnText, { color: theme.colors.accentText }]}>
                    {t('notifications.addReminderTime', {
                      time: formatTime(pickerTime.getHours(), pickerTime.getMinutes()),
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              {/* テスト送信 */}
              <TouchableOpacity
                style={styles.rowButton}
                onPress={() => sendTestNotification(partner)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowButtonTitle, { color: theme.colors.text }]}>{t('notifications.testButton')}</Text>
                <Text style={[styles.rowButtonArrow, { color: theme.colors.textSubtle }]}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── データ管理セクション ── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('settings.sectionData')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.rowButton} onPress={handleReset} activeOpacity={0.7}>
            <View>
              <Text style={[styles.rowButtonTitle, { color: '#f87171' }]}>{t('settings.resetData')}</Text>
              <Text style={[styles.rowButtonDesc, { color: theme.colors.textSubtle }]}>{t('settings.resetDataDesc')}</Text>
            </View>
            <Text style={[styles.rowButtonArrow, { color: '#f87171' }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── アプリ情報セクション ── */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textSubtle }]}>{t('settings.sectionAbout')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.rowButton} onPress={handleOpenPrivacyPolicy} activeOpacity={0.7}>
            <View>
              <Text style={[styles.rowButtonTitle, { color: theme.colors.text }]}>{t('settings.privacyPolicy')}</Text>
              <Text style={[styles.rowButtonDesc, { color: theme.colors.textSubtle }]}>{t('settings.privacyPolicyDesc')}</Text>
            </View>
            <Text style={[styles.rowButtonArrow, { color: theme.colors.textSubtle }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity style={styles.rowButton} onPress={handleOpenTermsOfService} activeOpacity={0.7}>
            <View>
              <Text style={[styles.rowButtonTitle, { color: theme.colors.text }]}>{t('settings.termsOfService')}</Text>
              <Text style={[styles.rowButtonDesc, { color: theme.colors.textSubtle }]}>{t('settings.termsOfServiceDesc')}</Text>
            </View>
            <Text style={[styles.rowButtonArrow, { color: theme.colors.textSubtle }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* バージョン情報 */}
        <Text style={[styles.version, { color: theme.colors.textSubtle }]}>
          {t('settings.version')} {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: 22, paddingBottom: 110 },

  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    paddingTop: 16,
    marginBottom: 28,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },

  /* パートナー */
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  partnerInfo: { flex: 1 },
  partnerInfoLabel: { fontSize: 11, color: '#555', fontWeight: '600', letterSpacing: 1, marginBottom: 3 },
  partnerName: { fontSize: 22, fontWeight: '800' },
  scorePill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  scorePillText: { fontSize: 13, fontWeight: '700' },

  /* 共通 */
  divider: { height: 1, backgroundColor: '#222', marginHorizontal: 16 },

  rowButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  rowButtonTitle: { fontSize: 16, fontWeight: '700', color: '#e0e0e0', marginBottom: 3 },
  rowButtonDesc: { fontSize: 12, color: '#555', fontWeight: '500' },
  rowButtonArrow: { fontSize: 24, color: '#444', fontWeight: '300' },

  /* 言語 */
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#444',
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: '#a78bfa' },
  radioInner: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#a78bfa',
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginTop: 8,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  timeSectionInner: {
    padding: 18,
    gap: 12,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeChipRemoveButton: {
    paddingLeft: 2,
  },
  timeChipRemoveText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyReminderText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  wheelPickerCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  wheelPicker: {
    width: '100%',
    height: 180,
  },
  addReminderBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  addReminderBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
