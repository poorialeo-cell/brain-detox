import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../types';
import GradientBackground from '../components/GradientBackground';
import BrainRotTestFlow from '../components/BrainRotTestFlow';
import BrainRotTestBlockedMessage from '../components/BrainRotTestBlockedMessage';
import { getBrainRotTestEligibility } from '../utils/brainRotTestLimits';
import { useTheme } from '../hooks/useTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'BrainRotTest'>;

export default function BrainRotTestScreen({ navigation }: Props) {
  const theme = useTheme();
  const scoreHistory = useAppStore((s) => s.scoreHistory);
  const applyTestResult = useAppStore((s) => s.applyTestResult);
  const markTestDone = useAppStore((s) => s.markTestDone);
  const [eligibilityTick, setEligibilityTick] = useState(0);

  const eligibility = useMemo(
    () => getBrainRotTestEligibility(scoreHistory, Date.now()),
    [scoreHistory, eligibilityTick],
  );

  useEffect(() => {
    const id = setInterval(() => setEligibilityTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleComplete = (delta: number) => {
    applyTestResult(delta);
    markTestDone();
    navigation.replace('Main');
  };

  const handleSkip = () => {
    markTestDone();
    navigation.replace('Main');
  };

  return (
    <GradientBackground variant="quiz">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />
        {eligibility.ok ? (
          <BrainRotTestFlow
            onComplete={handleComplete}
            onSkip={handleSkip}
            showSkipButton
            showBadge
          />
        ) : (
          <BrainRotTestBlockedMessage
            reason={eligibility.reason}
            nextAllowedAt={eligibility.nextAllowedAt}
            onDismiss={() => navigation.goBack()}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
