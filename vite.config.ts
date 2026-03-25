import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon-16.png",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
      ],
      manifest: {
        id: "/",
        name: "RO Navigator",
        short_name: "RO Nav",
        description:
          "Track repair orders and labor hours. Built for flat-rate automotive technicians.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#09090b",
        theme_color: "#2B82F0",
        categories: ["business", "productivity", "utilities"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        // screenshots enhance the PWA install prompt and app store listings.
        // Uncomment and add the actual image files to public/screenshots/ before enabling.
        // See public/screenshots/README.md for required dimensions and naming.
        // screenshots: [
        //   { src: "/screenshots/screenshot-mobile-1.png", sizes: "1290x2796", type: "image/png", form_factor: "narrow", label: "Log repair orders on mobile" },
        //   { src: "/screenshots/screenshot-mobile-2.png", sizes: "1290x2796", type: "image/png", form_factor: "narrow", label: "Track hours in the Summary tab" },
        //   { src: "/screenshots/screenshot-desktop-1.png", sizes: "1920x1080", type: "image/png", form_factor: "wide", label: "Desktop workspace" },
        // ],
      },
      workbox: {
        // Cache all static assets
        globPatterns: ["**/*.{js,css,html,ico,png,jpeg,jpg,svg,webp,woff2}"],
        // Network-first for Supabase API calls (so live data is always fresh)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          // Cache-first for Google Fonts and other CDN assets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Serve the app shell for all SPA routes (including /auth and /reset-password)
        // so the app loads correctly when navigated directly or when offline.
        navigateFallback: "/index.html",
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
