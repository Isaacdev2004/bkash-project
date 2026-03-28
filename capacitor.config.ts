import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aurthayon.app",
  appName: "Aurthayon",
  webDir: "dist",
  server: {
    // Dev: point at your machine IP + Vite port, then `npx cap run ios|android`
    // url: "http://192.168.1.x:8080",
    // cleartext: true,
    androidScheme: "https",
  },
};

export default config;
