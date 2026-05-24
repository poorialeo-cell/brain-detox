import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, ThemeName } from '../types';
import { useTheme } from '../hooks/useTheme';
import { APP_THEMES, THEME_OPTIONS } from '../theme/palettes';

type Props = NativeStackScreenProps<RootStackParamList, 'ThemeSelect'>;

export default function ThemeSelectScreen({ navigation }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const themeName = useAppStore((s) => s.themeName);
  const setThemeName = useAppStore((s) => s.setThemeName);

  const selectTheme = (next: ThemeName) => {
    setThemeName(next);
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
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings.sectionTheme')}</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {THEME_OPTIONS.map((opt, idx) => {
            const selected = opt === themeName;
            const optionColor = APP_THEMES[opt].colors.accent;
            return (
              <View key={opt}>
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.75}
                  onPress={() => selectTheme(opt)}
                >
                  <Text style={[styles.rowText, { color: optionColor }]}>
                    {t(`settings.theme${opt.charAt(0).toUpperCase()}${opt.slice(1)}`)}
                  </Text>
                  <Text style={[styles.mark, { color: selected ? optionColor : theme.colors.textSubtle }]}>
                    {selected ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>
                {idx < THEME_OPTIONS.length - 1 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
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
  rowText: { fontSize: 16, fontWeight: '700' },
  mark: { fontSize: 20, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 16 },
});
