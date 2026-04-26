import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';

import ja from '../locales/ja.json';
import en from '../locales/en.json';
import th from '../locales/th.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'ja';
const supportedLanguages = ['ja', 'en', 'th'];
const fallbackLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'ja';

i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
    en: { translation: en },
    th: { translation: th },
  },
  lng: fallbackLanguage,
  fallbackLng: 'ja',
  interpolation: { escapeValue: false },
});

export { i18n };
export const useI18n = () => useTranslation();
