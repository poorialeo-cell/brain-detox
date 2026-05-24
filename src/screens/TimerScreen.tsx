import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../hooks/useI18n';

export default function TimerScreen() {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('timer.title')}</Text>
      <Text style={styles.subtitle}>{t('timer.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
});