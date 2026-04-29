import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../types';
import GradientBackground from '../components/GradientBackground';
import BrainRotTestFlow from '../components/BrainRotTestFlow';

type Props = NativeStackScreenProps<RootStackParamList, 'BrainRotTest'>;

export default function BrainRotTestScreen({ navigation }: Props) {
  const { applyTestResult, markTestDone } = useAppStore();

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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <BrainRotTestFlow
          onComplete={handleComplete}
          onSkip={handleSkip}
          showSkipButton
          showBadge
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
