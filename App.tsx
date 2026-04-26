import React, { useEffect, useState } from 'react';
import './src/hooks/useI18n';
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoader from './src/components/SplashLoader';
import { waitForHydration } from './src/store/useAppStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    waitForHydration().then(() => setIsReady(true));
  }, []);

  if (!isReady) return <SplashLoader />;

  return <AppNavigator />;
}
