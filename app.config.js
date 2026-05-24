/**
 * Expo dynamic config.
 * production プロファイルでは expo-dev-client を除外して
 * バンドルサイズと攻撃面を最小化する。
 *
 * EAS_BUILD_PROFILE は EAS Build 環境で `eas.json` の profile 名が自動注入される。
 * ローカル開発（`expo start`）では未設定なので development 扱い。
 */
const profile = process.env.EAS_BUILD_PROFILE ?? 'development';
const isProduction = profile === 'production';

const plugins = [
  [
    'expo-notifications',
    {
      color: '#a78bfa',
    },
  ],
  'expo-asset',
  '@react-native-community/datetimepicker',
  'expo-localization',
];

// production 以外（development / preview / ローカル）でのみ dev client を含める
if (!isProduction) {
  plugins.unshift('expo-dev-client');
}

module.exports = {
  expo: {
    name: 'brain-detox',
    slug: 'brain-detox',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    plugins,
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.braindetox.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.braindetox.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '26ef59bf-2523-4532-be9c-bc686c4382d2',
      },
    },
  },
};
