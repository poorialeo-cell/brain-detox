import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import './src/hooks/useI18n';
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoader from './src/components/SplashLoader';
import { waitForHydration, useAppStore } from './src/store/useAppStore';
import { navigateTo } from './src/navigation/navigationRef';
import type { NotificationScreen } from './src/services/notificationService';
import { signInAnon } from './src/services/authService';
import { isDueForTest } from './src/services/scoringService';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. ストアのハイドレーション待ち
      await waitForHydration();

      const store = useAppStore.getState();

      // 2. スコアの自然減衰を適用
      if (store.isOnboardingComplete) {
        store.applyDecay();
      }

      // 3. Firebase 匿名認証
      if (!store.userId) {
        const newId = await signInAnon();
        if (newId) {
          store.setUserId(newId);
          await store.syncProfile();
        }
      }

      setIsReady(true);

      // 4. ブレインロットテストが必要なら3秒後にモーダル表示
      if (store.isOnboardingComplete && isDueForTest(store.lastTestDate)) {
        setTimeout(() => {
          navigateTo('BrainRotTest');
        }, 3000);
      }
    };

    init();
  }, []);

  useEffect(() => {
    // 通知タップ → ディープリンク
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as NotificationScreen;
      if (screen === 'Action') navigateTo('Action');
      else navigateTo('Home');
    });
    return () => sub.remove();
  }, []);

  if (!isReady) return <SplashLoader />;
  return <AppNavigator />;
}
