import { ExpoConfig, ConfigContext } from 'expo/config';
import * as dotenv from 'dotenv';

dotenv.config();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Pechi',
  slug: 'pechi-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0d0c0f',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.pechi.mobile',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Pechi needs microphone access for voice interaction with the service assistant.',
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
        NSAllowsArbitraryLoads: true,
      },
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: 'com.pechi.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0d0c0f',
    },
    edgeToEdgeEnabled: true,
    permissions: ['RECORD_AUDIO'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '15.1' },
        android: { minSdkVersion: 24 },
      },
    ],
  ],
  extra: {
    apiBase: process.env.API_BASE || 'http://localhost:8021',
  },
});
