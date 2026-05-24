import type { ThemeName } from '../types';

export type AppTheme = {
  id: ThemeName;
  labelKey: string;
  statusBarStyle: 'light-content' | 'dark-content';
  gradients: {
    default: readonly [string, string];
    action: readonly [string, string];
    quiz: readonly [string, string];
  };
  colors: {
    appBg: string;
    card: string;
    cardAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    tabGlow: string;
    danger: string;
  };
};

export const APP_THEMES: Record<ThemeName, AppTheme> = {
  dark: {
    id: 'dark',
    labelKey: 'settings.themeDark',
    statusBarStyle: 'light-content',
    gradients: {
      default: ['#111117', '#191825'],
      action: ['#121118', '#1b1927'],
      quiz: ['#0f1119', '#181c2a'],
    },
    colors: {
      appBg: '#111117',
      card: '#181923',
      cardAlt: '#1d1f2b',
      border: '#323448',
      text: '#f2f4ff',
      textMuted: '#d7dbef',
      textSubtle: '#aeb5d2',
      accent: '#a9b4ff',
      accentSoft: '#313a63',
      accentText: '#e0e5ff',
      tabGlow: 'rgba(169,180,255,0.2)',
      danger: '#ef8f9c',
    },
  },
  white: {
    id: 'white',
    labelKey: 'settings.themeWhite',
    statusBarStyle: 'dark-content',
    gradients: {
      default: ['#f7f8fb', '#eef1f7'],
      action: ['#f7fafc', '#edf1f6'],
      quiz: ['#f8f8fd', '#edf0fa'],
    },
    colors: {
      appBg: '#f5f7fb',
      card: '#ffffff',
      cardAlt: '#f4f6fb',
      border: '#d8deea',
      text: '#1f2638',
      textMuted: '#3f4b6c',
      textSubtle: '#58627e',
      accent: '#5f73c6',
      accentSoft: '#d4ddff',
      accentText: '#33478f',
      tabGlow: 'rgba(95,115,198,0.16)',
      danger: '#ca6674',
    },
  },
  green: {
    id: 'green',
    labelKey: 'settings.themeGreen',
    statusBarStyle: 'light-content',
    gradients: {
      default: ['#0f1b18', '#152621'],
      action: ['#0e1d19', '#173027'],
      quiz: ['#0f1c1a', '#162a25'],
    },
    colors: {
      appBg: '#10201b',
      card: '#172d26',
      cardAlt: '#1c342c',
      border: '#385147',
      text: '#eefaf4',
      textMuted: '#d0e5db',
      textSubtle: '#a9c2b6',
      accent: '#8dc7ae',
      accentSoft: '#27483c',
      accentText: '#d6f8e8',
      tabGlow: 'rgba(141,199,174,0.22)',
      danger: '#ec9ea3',
    },
  },
  blue: {
    id: 'blue',
    labelKey: 'settings.themeBlue',
    statusBarStyle: 'light-content',
    gradients: {
      default: ['#101723', '#152033'],
      action: ['#101a28', '#17253b'],
      quiz: ['#0f1827', '#162238'],
    },
    colors: {
      appBg: '#121b2b',
      card: '#1a263a',
      cardAlt: '#1f2d44',
      border: '#384c69',
      text: '#edf3ff',
      textMuted: '#cfdaef',
      textSubtle: '#aabbd9',
      accent: '#97b8e8',
      accentSoft: '#2a3e5d',
      accentText: '#d9e8ff',
      tabGlow: 'rgba(151,184,232,0.22)',
      danger: '#e9a0a8',
    },
  },
  orange: {
    id: 'orange',
    labelKey: 'settings.themeOrange',
    statusBarStyle: 'light-content',
    gradients: {
      default: ['#1b1410', '#2a1e15'],
      action: ['#1d1510', '#2f2117'],
      quiz: ['#1c140f', '#2b1f16'],
    },
    colors: {
      appBg: '#201711',
      card: '#302117',
      cardAlt: '#3a291d',
      border: '#5b4638',
      text: '#fff5ef',
      textMuted: '#edd8ca',
      textSubtle: '#c5a592',
      accent: '#efb895',
      accentSoft: '#583f2c',
      accentText: '#ffe7d5',
      tabGlow: 'rgba(239,184,149,0.22)',
      danger: '#ef9aa0',
    },
  },
  red: {
    id: 'red',
    labelKey: 'settings.themeRed',
    statusBarStyle: 'light-content',
    gradients: {
      default: ['#1a1215', '#281a20'],
      action: ['#1b1217', '#2d1a22'],
      quiz: ['#1a1116', '#2a1720'],
    },
    colors: {
      appBg: '#201419',
      card: '#2d1b23',
      cardAlt: '#36212a',
      border: '#5a3a46',
      text: '#fff2f6',
      textMuted: '#efd0d8',
      textSubtle: '#c6a3af',
      accent: '#e7a5b8',
      accentSoft: '#583240',
      accentText: '#ffdbe5',
      tabGlow: 'rgba(231,165,184,0.22)',
      danger: '#ff9ea7',
    },
  },
};

export const THEME_OPTIONS: ThemeName[] = ['dark', 'white', 'green', 'blue', 'orange', 'red'];

export const DEFAULT_THEME: ThemeName = 'dark';
