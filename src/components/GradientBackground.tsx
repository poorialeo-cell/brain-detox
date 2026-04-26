import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'action' | 'quiz';
}

const GRADIENTS = {
  default: ['#0d0d0d', '#0a0818'] as const,
  action:  ['#0d0d0d', '#0d0a14'] as const,
  quiz:    ['#0d0d0d', '#0a0d16'] as const,
};

export default function GradientBackground({ children, style, variant = 'default' }: Props) {
  return (
    <LinearGradient
      colors={GRADIENTS[variant]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
