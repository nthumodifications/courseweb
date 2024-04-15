import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nthumods.courseweb',
  appName: 'NTHUMods',
  webDir: 'fakeout',
  server: {
    url: process.env.NODE_ENV === 'production' ? 'https://nthumods.com' : 'http://192.168.31.109:3000',
    androidScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  },

};

export default config;
