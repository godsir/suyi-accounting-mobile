import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suyi.accounting',
  appName: 'Suyi记账',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'https://suyiapi.cpolar.cn'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
      layoutName: "launch_screen",
      useDialog: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ffffff",
      overlaysWebView: false
    }
  }
};

export default config;
