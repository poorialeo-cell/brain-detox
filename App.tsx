import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { i18n } from './src/hooks/useI18n';
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoader from './src/components/SplashLoader';
import BadgePopup from './src/components/BadgePopup';
import { waitForHydration, useAppStore } from './src/store/useAppStore';
import { navigateTo } from './src/navigation/navigationRef';
import type { NotificationScreen } from './src/services/notificationService';
import { signInAnon } from './src/services/authService';
import { isDueForTest } from './src/services/scoringService';
import { preloadPartnerImages } from './src/services/partnerImagePreload';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const newlyEarnedBadges = useAppStore((s) => s.newlyEarnedBadges);
  const dismissBadgePopup = useAppStore((s) => s.dismissBadgePopup);
  const appSessionKey = useAppStore((s) => s.appSessionKey);

  useEffect(() => {
    let cancelled = false;
    let testNavigationTimer: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      try {
        await waitForHydration();
        if (cancelled) return;
        await i18n.changeLanguage(useAppStore.getState().language);
        if (cancelled) return;
        await preloadPartnerImages();
        if (cancelled) return;

        const store = useAppStore.getState();
        if (store.isOnboardingComplete) {
          store.finalizeExpiredPostTestCycleIfNeeded();
          store.applyDecay();
        }

        // 常に signInAnon を呼ぶ（Auth 復元を待ってから判定・なければ新規作成）
        const newId = await signInAnon();
        if (cancelled) return;
        if (newId && newId !== store.userId) {
          store.setUserId(newId);
          await store.syncProfile();
        } else if (!store.userId && newId) {
          store.setUserId(newId);
        }
        if (cancelled) return;

        if (store.isOnboardingComplete && isDueForTest(store.lastTestDate)) {
          testNavigationTimer = setTimeout(() => navigateTo('BrainRotTest'), 3000);
        }
      } catch (e) {
        if (__DEV__) console.error('[App] init error:', e);
      } finally {
        // 例外発生時もスプラッシュを抜けて、最低限のUI（オンボーディング）に進めるようにする
        if (!cancelled) setIsReady(true);
      }
    };
    init();

    return () => {
      cancelled = true;
      if (testNavigationTimer) clearTimeout(testNavigationTimer);
    };
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
    <View style={styles.root} key={appSessionKey}>
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
