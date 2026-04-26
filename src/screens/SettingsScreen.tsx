import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useI18n, i18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { Language, PartnerType } from '../types';

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
  const { selectedPartner, language, brainScore, setLanguage, setOnboardingComplete, setSelectedPartner, resetAll } = useAppStore();

  const partner = selectedPartner ?? 'counselor';
  const pc = PARTNER_CONFIG[partner];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleChangePartner = () => {
    setOnboardingComplete(false);
    setSelectedPartner(null as any);
  };

  const handleReset = () => {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmMessage'),
      [
        { text: t('settings.resetConfirmNo'), style: 'cancel' },
        {
          text: t('settings.resetConfirmYes'),
          style: 'destructive',
          onPress: () => {
            resetAll();
            i18n.changeLanguage('ja');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

        {/* ── パートナーセクション ── */}
        <Text style={styles.sectionLabel}>{t('settings.sectionPartner')}</Text>
        <View style={styles.card}>

          {/* 現在のパートナー表示 */}
          <View style={styles.partnerRow}>
            <View style={[styles.partnerAvatar, { borderColor: pc.color + '66' }]}>
              <Text style={styles.partnerAvatarEmoji}>{pc.emoji}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerInfoLabel}>{t('settings.currentPartner')}</Text>
              <Text style={[styles.partnerName, { color: pc.color }]}>
                {t(`partner.${partner}.name`)}
              </Text>
            </View>
            <View style={[styles.scorePill, { borderColor: pc.color + '55' }]}>
              <Text style={[styles.scorePillText, { color: pc.color }]}>{brainScore}pt</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* パートナー変更ボタン */}
          <TouchableOpacity style={styles.rowButton} onPress={handleChangePartner} activeOpacity={0.7}>
            <View>
              <Text style={styles.rowButtonTitle}>{t('settings.changePartner')}</Text>
              <Text style={styles.rowButtonDesc}>{t('settings.changePartnerDesc')}</Text>
            </View>
            <Text style={styles.rowButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 言語セクション ── */}
        <Text style={styles.sectionLabel}>{t('settings.sectionLanguage')}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, idx) => (
            <View key={lang.code}>
              <TouchableOpacity
                style={styles.langRow}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={styles.langLabel}>{t(lang.key)}</Text>
                <View style={[
                  styles.radioOuter,
                  language === lang.code && styles.radioOuterActive,
                ]}>
                  {language === lang.code && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
              {idx < LANGUAGES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* ── データ管理セクション ── */}
        <Text style={styles.sectionLabel}>{t('settings.sectionData')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowButton} onPress={handleReset} activeOpacity={0.7}>
            <View>
              <Text style={[styles.rowButtonTitle, { color: '#f87171' }]}>{t('settings.resetData')}</Text>
              <Text style={styles.rowButtonDesc}>{t('settings.resetDataDesc')}</Text>
            </View>
            <Text style={[styles.rowButtonArrow, { color: '#f87171' }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* バージョン情報 */}
        <Text style={styles.version}>{t('settings.version')} 0.1.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

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
    gap: 14,
  },
  partnerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1a1a1a', borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  partnerAvatarEmoji: { fontSize: 24 },
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
});
