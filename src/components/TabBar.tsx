import React, { useRef, useEffect, useContext } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Platform, type LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarHeightCallbackContext, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../hooks/useTheme';

const TAB_IMAGES: Record<string, ReturnType<typeof require>> = {
  Home:     require('../../assets/tabs/tab_home.png'),
  Action:   require('../../assets/tabs/tab_action.png'),
  History:  require('../../assets/tabs/tab_history.png'),
  Settings: require('../../assets/tabs/tab_settings.png'),
};

function TabItem({
  route, isFocused, onPress, label, accent, inactive, tabGlow,
}: {
  route: any; isFocused: boolean; onPress: () => void; label: string;
  accent: string; inactive: string; tabGlow: string;
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

  const labelColor = isFocused ? '#ffffff' : 'rgba(255,255,255,0.45)';

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[styles.glow, { opacity: glowOp, backgroundColor: tabGlow }]} />
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale }], opacity }]}>
        <Image
          source={TAB_IMAGES[route.name]}
          style={styles.tabIcon}
          resizeMode="contain"
        />
        <Animated.Text style={[styles.label, { color: labelColor }]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const haptics = useHaptics();
  const theme = useTheme();
  const onTabBarHeight = useContext(BottomTabBarHeightCallbackContext);

  const onWrapperLayout = (e: LayoutChangeEvent) => {
    onTabBarHeight?.(e.nativeEvent.layout.height);
  };

  return (
    <View style={styles.wrapper} onLayout={onWrapperLayout}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 30}
        tint={theme.id === 'white' ? 'light' : 'dark'}
        style={[styles.blurContainer, { borderColor: theme.colors.border }]}
      >
        <View style={[styles.innerBar, { backgroundColor: `${theme.colors.card}cc` }]}>
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
                accent={theme.colors.accentText}
                inactive={theme.colors.textSubtle}
                tabGlow={theme.colors.tabGlow}
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
    paddingVertical: 4, position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 71, height: 62, borderRadius: 18,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabIcon: {
    width: 52,
    height: 52,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: -8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
