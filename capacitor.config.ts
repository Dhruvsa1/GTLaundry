import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.laundry",
  appName: "Laundry Tracker",
  webDir: ".next", // Use .next for dynamic Next.js builds
  ios: {
    contentInset: "always"
  },
};

export default config;
