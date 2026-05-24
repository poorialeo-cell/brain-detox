import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { Language, RootStackParamList } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageSelect'>;

const LANGUAGES: { code: Language; key: string; flag: string }[] = [
  { code: 'ja', key: 'settings.langJa', flag: '🇯🇵' },
  { code: 'en', key: 'settings.langEn', flag: '🇺🇸' },
  { code: 'th', key: 'settings.langTh', flag: '🇹🇭' },
];

export default function LanguageSelectScreen({ navigation }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const selectLanguage = (next: Language) => {
    setLanguage(next);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.appBg }]}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.colors.appBg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Text style={[styles.backText, { color: theme.colors.accentText }]}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings.sectionLanguage')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {LANGUAGES.map((item, idx) => {
            const selected = item.code === language;
            return (
              <View key={item.code}>
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.75}
                  onPress={() => selectLanguage(item.code)}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={[styles.rowText, { color: selected ? theme.colors.accentText : theme.colors.text }]}>
                      {t(item.key)}
                    </Text>
                  </View>
                  <Text style={[styles.mark, { color: selected ? theme.colors.accent : theme.colors.textSubtle }]}>
                    {selected ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>
                {idx < LANGUAGES.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  backText: { fontSize: 16, fontWeight: '700' },
  scroll: { paddingHorizontal: 22, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flag: { fontSize: 22 },
  rowText: { fontSize: 16, fontWeight: '700' },
  mark: { fontSize: 20, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 16 },
});
