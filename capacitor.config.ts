import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nthumods.courseweb',
  appName: 'NTHUMods',
  webDir: 'build',
  server: {
    url: 'https://nthumods.com',
    androidScheme: 'https',
  },

};

export default config;
