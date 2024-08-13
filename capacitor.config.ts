import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nthumods.courseweb",
  appName: "NTHUMods",
  webDir: "fakeout",
  server: {
    url: "https://nthumods.com",
    androidScheme: "https",
  },
};

export default config;
