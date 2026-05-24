import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList, MainTabParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Root Stack の画面名（モーダル含む） */
const ROOT_STACK_SCREENS = new Set<string>([
  'Quiz',
  'PartnerResult',
  'BrainRotTest',
  'Main',
  'DataResetConfirm',
  'ThemeSelect',
  'LanguageSelect',
]);

/**
 * 画面名を Main タブ／Root Stack のどちらにも自動振り分けして遷移する。
 * - Main タブ画面（Home/Action/History/Settings）: Main 内 navigate
 * - Root Stack 画面（BrainRotTest 等のモーダル）: 直接 Root に navigate
 *
 * 型システムを動的にバイパスして、両 Stack の画面名を許容する。
 */
export function navigateTo(
  screen: keyof MainTabParamList | keyof RootStackParamList,
  params?: object,
) {
  if (!navigationRef.isReady()) return;

  // React Navigation の navigate オーバーロード（タプル形式）を回避するため as any 経由で呼び出す
  // 画面名を Set 判定して Root / Main を振り分ける
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigationRef as any;

  if (ROOT_STACK_SCREENS.has(screen as string)) {
    nav.navigate(screen, params);
    return;
  }

  nav.navigate('Main', { screen, ...params });
}
