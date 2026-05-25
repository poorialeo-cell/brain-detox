import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import GradientBackground from '../components/GradientBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  icon: string;
  title: string;
  body: string;
}

export default function WelcomeScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const navigation = useNavigation();
  const setHasSeenWelcome = useAppStore((s) => s.setHasSeenWelcome);
  const hasSeenWelcome = useAppStore((s) => s.hasSeenWelcome);

  const slides = t('welcome.slides', { returnObjects: true }) as Slide[];
  const listRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isFromSettings = hasSeenWelcome;
  const isLastSlide = activeIndex === slides.length - 1;

  const handleComplete = useCallback(() => {
    if (isFromSettings) {
      navigation.goBack();
    } else {
      setHasSeenWelcome(true);
    }
  }, [isFromSettings, navigation, setHasSeenWelcome]);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      handleComplete();
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  }, [isLastSlide, activeIndex, handleComplete]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <Text style={[styles.slideTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.slideBody, { color: theme.colors.textSubtle }]}>{item.body}</Text>
      </View>
    ),
    [theme],
  );

  const accentColor = theme.colors.accent;

  return (
    <GradientBackground variant="quiz">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />

        {/* ヘッダー：スキップ or 閉じる */}
        <View style={styles.header}>
          {isFromSettings ? (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
              <Text style={[styles.skipText, { color: theme.colors.textSubtle }]}>
                {t('welcome.close')}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.headerSpacer} />
              {!isLastSlide && (
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
                  <Text style={[styles.skipText, { color: theme.colors.textSubtle }]}>
                    {t('welcome.skip')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* カルーセル */}
        <FlatList
          ref={listRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={styles.flatList}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {/* フッター：ドット + ボタン */}
        <View style={styles.footer}>
          {/* ページドット */}
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex
                    ? [styles.dotActive, { backgroundColor: accentColor }]
                    : [styles.dotInactive, { backgroundColor: theme.colors.border }],
                ]}
              />
            ))}
          </View>

          {/* 次へ / はじめる ボタン */}
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: accentColor }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide
                ? isFromSettings
                  ? t('welcome.close')
                  : t('welcome.start')
                : t('welcome.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 44,
  },
  headerSpacer: {
    flex: 1,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },

  flatList: {
    flex: 1,
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 24,
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  icon: {
    fontSize: 56,
  },

  slideTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 34,
  },

  slideBody: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },

  footer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 12,
    alignItems: 'center',
    gap: 24,
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    borderRadius: 6,
  },
  dotActive: {
    width: 22,
    height: 8,
  },
  dotInactive: {
    width: 8,
    height: 8,
  },

  nextButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
