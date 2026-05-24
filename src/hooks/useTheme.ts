import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { APP_THEMES, DEFAULT_THEME } from '../theme/palettes';

export function useTheme() {
  const themeName = useAppStore((s) => s.themeName);
  return useMemo(() => APP_THEMES[themeName] ?? APP_THEMES[DEFAULT_THEME], [themeName]);
}
