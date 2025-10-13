module.exports = {
  expo: {
    name: 'swccg-mobile',
    slug: 'swccg-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1a1a1a',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fancymatt.swccgmobile',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.fancymatt.swccgmobile',
      // Enable auto backup with custom rules
      allowBackup: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '8bf2324b-7fd0-404d-a407-603a4ca5db20',
      },
    },
    plugins: [
      // Custom plugin to add fullBackupContent to AndroidManifest
      function withAndroidBackupRules(config) {
        const { withAndroidManifest } = require('@expo/config-plugins');

        return withAndroidManifest(config, (config) => {
          const mainApplication = config.modResults.manifest.application[0];
          mainApplication.$['android:fullBackupContent'] = '@xml/backup_rules';
          return config;
        });
      },
    ],
  },
};
