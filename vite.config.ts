import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Google Calendar Tonton",
  version: "1.2.0",
  description: "Auto-send Tonton's schedule from Google Calendar.",
  permissions: ["storage"],
  host_permissions: ["https://calendar.google.com/*"],
  action: {
    default_icon: {
      "16": "src/assets/icon16.png",
      "19": "src/assets/icon19.png",
      "38": "src/assets/icon38.png",
      "128": "src/assets/icon128.png",
    },
    default_title: "Google Calendar Tonton",
  },
  options_ui: {
    page: "src/options.html",
    open_in_tab: true,
  },
  icons: {
    "16": "src/assets/icon16.png",
    "19": "src/assets/icon19.png",
    "38": "src/assets/icon38.png",
    "128": "src/assets/icon128.png",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://tonton.amaneku.com/list.php?id=*"],
      js: ["src/content.tsx"],
    },
  ],
});

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        content: "src/content.tsx",
        background: "src/background.ts",
        options: "src/options.html",
      },
    },
  },
});
