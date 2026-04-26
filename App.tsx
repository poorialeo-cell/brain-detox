import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import './src/hooks/useI18n';
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoader from './src/components/SplashLoader';
import { waitForHydration, useAppStore } from './src/store/useAppStore';
import { navigateTo } from './src/navigation/navigationRef';
import type { NotificationScreen } from './src/services/notificationService';
import { signInAnon } from './src/services/authService';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. ストアのハイドレーション待ち
      await waitForHydration();

      // 2. Firebase 匿名認証（既存ユーザーは自動ログイン）
      const { userId, setUserId, syncProfile } = useAppStore.getState();
      if (!userId) {
        const newId = await signInAnon();
        if (newId) {
          setUserId(newId);
          await syncProfile();
        }
      }

      setIsReady(true);
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
