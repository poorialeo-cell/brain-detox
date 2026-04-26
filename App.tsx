import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import './src/hooks/useI18n';
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoader from './src/components/SplashLoader';
import BadgePopup from './src/components/BadgePopup';
import { waitForHydration, useAppStore } from './src/store/useAppStore';
import { navigateTo } from './src/navigation/navigationRef';
import type { NotificationScreen } from './src/services/notificationService';
import { signInAnon } from './src/services/authService';
import { isDueForTest } from './src/services/scoringService';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const newlyEarnedBadges = useAppStore((s) => s.newlyEarnedBadges);
  const dismissBadgePopup = useAppStore((s) => s.dismissBadgePopup);

  useEffect(() => {
    const init = async () => {
      await waitForHydration();
      const store = useAppStore.getState();
      if (store.isOnboardingComplete) store.applyDecay();
      if (!store.userId) {
        const newId = await signInAnon();
        if (newId) { store.setUserId(newId); await store.syncProfile(); }
      }
      setIsReady(true);
      if (store.isOnboardingComplete && isDueForTest(store.lastTestDate)) {
        setTimeout(() => navigateTo('BrainRotTest'), 3000);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as NotificationScreen;
      if (screen === 'Action') navigateTo('Action');
      else navigateTo('Home');
    });
    return () => sub.remove();
  }, []);

  if (!isReady) return <SplashLoader />;

  return (
    <View style={styles.root}>
      <AppNavigator />
      {/* バッジポップアップ（キューの先頭を表示） */}
      {newlyEarnedBadges.length > 0 && (
        <BadgePopup
          badge={newlyEarnedBadges[0]}
          onDismiss={dismissBadgePopup}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
