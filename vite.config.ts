import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Google Calendar Tonton",
  version: "1.0.0",
  description: "Auto-send Tonton's schedule from Google Calendar.",
  host_permissions: ["https://calendar.google.com/*"],
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
      },
    },
  },
});
