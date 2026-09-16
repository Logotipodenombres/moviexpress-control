import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.jpg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Moviexpress · Centro de control',
        short_name: 'Moviexpress',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#111214',
        theme_color: '#ffca05',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        navigateFallbackDenylist: [/\/auth\//],
        runtimeCaching: [],
      },
    }),
  ],
});
