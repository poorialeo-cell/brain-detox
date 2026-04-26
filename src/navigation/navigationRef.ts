import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigateTo(screen: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main', { screen, ...params });
  }
}
