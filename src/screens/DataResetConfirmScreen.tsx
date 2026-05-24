import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'DataResetConfirm'>;

export default function DataResetConfirmScreen({ navigation }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const resetAll = useAppStore((s) => s.resetAll);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleExecute = () => {
    if (!acknowledged) return;
    resetAll();
    /** resetAll で isOnboardingComplete が false になりスタックが差し替わる */
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.appBg }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.colors.appBg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: theme.colors.accentText }]}>{t('settings.resetSecondBack')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings.resetSecondTitle')}</Text>
        <Text style={[styles.intro, { color: theme.colors.textMuted }]}>{t('settings.resetSecondIntro')}</Text>
        <View style={[styles.bulletCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.bullets, { color: theme.colors.textMuted }]}>{t('settings.resetSecondBullets')}</Text>
        </View>

        <View style={styles.ackRow}>
          <Text style={[styles.ackLabel, { color: theme.colors.text }]}>{t('settings.resetAckLabel')}</Text>
          <Switch
            value={acknowledged}
            onValueChange={setAcknowledged}
            trackColor={{ false: theme.colors.border, true: theme.colors.danger }}
            thumbColor={acknowledged ? '#fff' : theme.colors.textSubtle}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.executeBtn,
            { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
            !acknowledged && styles.executeBtnDisabled,
            !acknowledged && { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border },
          ]}
          onPress={handleExecute}
          disabled={!acknowledged}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.executeBtnText,
              { color: '#fff' },
              !acknowledged && styles.executeBtnTextDisabled,
              !acknowledged && { color: theme.colors.textSubtle },
            ]}
          >
            {t('settings.resetExecute')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  backBtnText: { fontSize: 16, fontWeight: '700', color: '#a78bfa' },
  scroll: { paddingHorizontal: 22, paddingBottom: 48 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 14,
    lineHeight: 30,
  },
  intro: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
    lineHeight: 24,
    marginBottom: 16,
  },
  bulletCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  bullets: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bbb',
    lineHeight: 24,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingVertical: 4,
  },
  ackLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    lineHeight: 22,
  },
  executeBtn: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  executeBtnDisabled: {
    backgroundColor: '#222',
    borderColor: '#333',
  },
  executeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fecaca',
  },
  executeBtnTextDisabled: {
    color: '#555',
  },
});
