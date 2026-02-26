import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        disableDevLogs: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        id: "nthumods",
        name: "NTHUMods",
        short_name: "NTHUMods",
        description:
          "\u{1F3EB} \u570B\u7ACB\u6E05\u83EF\u5927\u5B78\u8AB2\u8868\u3001\u6821\u8ECA\u6642\u9593\u8868\u3001\u8CC7\u6599\u6574\u5408\u5E73\u81FA\uFF0C\u5B78\u751F\u4E3B\u5C0E\u3001\u5B78\u751F\u81EA\u4E3B\u958B\u767C\u3002",
        display: "standalone",
        orientation: "any",
        start_url: "https://nthumods.com",
        lang: "zh",
        dir: "auto",
        theme_color: "#7e1083",
        icons: [
          { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
          {
            src: "images/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "images/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "images/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "images/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "images/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "images/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "images/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
    mode === "production" &&
      sentryVitePlugin({
        org: "nthumods",
        project: "courseweb",
        silent: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@courseweb/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@courseweb/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@courseweb/database": path.resolve(
        __dirname,
        "../../packages/database/src",
      ),
    },
  },
  optimizeDeps: {
    exclude: ["canvas"],
  },
  build: {
    sourcemap: true,
    outDir: "dist",
  },
  define: {
    __SENTRY_DEBUG__: false,
    __SENTRY_TRACING__: false,
    __RRWEB_EXCLUDE_IFRAME__: true,
    __RRWEB_EXCLUDE_SHADOW_DOM__: true,
    __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
  },
}));
