import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { RootStackParamList, MainTabParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { navigationRef } from './navigationRef';
import TabBar from '../components/TabBar';

import QuizScreen from '../screens/QuizScreen';
import PartnerScreen from '../screens/PartnerScreen';
import BrainRotTestScreen from '../screens/BrainRotTestScreen';
import DataResetConfirmScreen from '../screens/DataResetConfirmScreen';
import HomeScreen from '../screens/HomeScreen';
import ActionScreen from '../screens/ActionScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ThemeSelectScreen from '../screens/ThemeSelectScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { t, i18n } = useTranslation();
  return (
    <Tab.Navigator
      key={i18n.language}
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="Action"   component={ActionScreen}   options={{ tabBarLabel: t('nav.action') }} />
      <Tab.Screen name="History"  component={HistoryScreen}  options={{ tabBarLabel: t('nav.history') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('nav.settings') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isOnboardingComplete = useAppStore((s) => s.isOnboardingComplete);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboardingComplete ? (
          <>
            <Stack.Screen name="Quiz"         component={QuizScreen}         options={{ animation: 'fade' }} />
            <Stack.Screen name="PartnerResult" component={PartnerScreen}      options={{ animation: 'slide_from_bottom' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"             component={MainTabs}              options={{ animation: 'fade' }} />
            <Stack.Screen name="BrainRotTest"     component={BrainRotTestScreen}  options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="DataResetConfirm" component={DataResetConfirmScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="ThemeSelect"      component={ThemeSelectScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="LanguageSelect"   component={LanguageSelectScreen} options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
