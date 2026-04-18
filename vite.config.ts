import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const appVersion = process.env.npm_package_version || "dev";
const appBuildTime = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_TIME__: JSON.stringify(appBuildTime),
  },
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
      devOptions: {
        enabled: false,
      },
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

        // Remove caches that belong to previous SW versions when a new SW
        // activates.  Without this, old JS/CSS chunks from prior builds linger
        // in the cache and can be served for asset requests that no longer
        // match any precache entry, causing "Failed to fetch dynamically
        // imported module" errors and the infinite loading screen.
        cleanupOutdatedCaches: true,

        // Never cache Supabase traffic in the service worker.
        // Supabase responses can include authenticated user/session state and
        // rapidly changing RO data; serving them from SW runtime cache can
        // create stale or cross-version behavior after deploys.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
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
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        // clientsClaim: immediately take control of all open tabs when the new
        // SW activates.  Combined with the controllerchange reload in main.tsx,
        // this ensures pages refresh against the new asset hashes right away
        // instead of serving stale chunks until the user manually reloads.
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
