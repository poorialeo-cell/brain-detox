import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useHaptics } from '../hooks/useHaptics';

const TAB_ICONS: Record<string, string> = {
  Home:     '🧠',
  Action:   '⚡',
  History:  '📊',
  Settings: '⚙️',
};

function TabItem({
  route, isFocused, onPress, label,
}: {
  route: any; isFocused: boolean; onPress: () => void; label: string;
}) {
  const scale  = useRef(new Animated.Value(isFocused ? 1.18 : 1)).current;
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0.4)).current;
  const glowOp  = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: isFocused ? 1.18 : 1,   useNativeDriver: true, damping: 14, stiffness: 200 }),
      Animated.timing(opacity, { toValue: isFocused ? 1 : 0.4,    duration: 180, useNativeDriver: true }),
      Animated.timing(glowOp,  { toValue: isFocused ? 1 : 0,      duration: 180, useNativeDriver: true }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[styles.glow, { opacity: glowOp }]} />
      <Animated.Text style={{ fontSize: 22, transform: [{ scale }], opacity }}>
        {TAB_ICONS[route.name] ?? '●'}
      </Animated.Text>
      <Animated.Text style={[styles.label, { opacity, color: isFocused ? '#c4b5fd' : '#666' }]}>
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const haptics = useHaptics();

  return (
    <View style={styles.wrapper}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 30}
        tint="dark"
        style={styles.blurContainer}
      >
        <View style={styles.innerBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;
            const isFocused = state.index === index;

            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={isFocused}
                onPress={() => {
                  haptics.light();
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                label={label}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  blurContainer: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  innerBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,8,20,0.55)',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 4, position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  label: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.2,
  },
});
