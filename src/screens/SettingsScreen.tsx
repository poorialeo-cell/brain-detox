import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../hooks/useI18n';

export default function SettingsScreen() {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});
