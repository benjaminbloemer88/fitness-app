/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Auf GitHub Pages liegt die App unter https://<name>.github.io/<repo>/.
// Der Unterpfad kommt im Deployment-Workflow über BASE_PATH rein, lokal ist er „/“.
const base = process.env.BASE_PATH ?? '/';

// Version für die Anzeige in den Einstellungen: „0.1.0 (2026-11-22 14:05)“
const version = `${process.env.npm_package_version ?? '0.0.0'} (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`;

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      // „prompt“: Ein Update wird erst nach Tipp auf „Neu laden“ aktiv,
      // damit die App nicht mitten im Training neu startet.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Fitness – Trainingsplan & Log',
        short_name: 'Fitness',
        description: 'Wochenplan, Gym- und Lauf-Log mit Sync zum Google-Doc',
        lang: 'de',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles, was die App zum Start braucht, wird vorab gecacht → läuft offline im Gym.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        // Übungsfotos (free-exercise-db auf GitHub): einmal laden, dann aus dem Cache – auch offline.
        // Derselbe Cache wird von src/lib/bilderVorladen.ts vorab befüllt.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://raw.githubusercontent.com' && url.pathname.startsWith('/yuhonas/free-exercise-db/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'uebungsbilder',
              matchOptions: { ignoreVary: true },
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
