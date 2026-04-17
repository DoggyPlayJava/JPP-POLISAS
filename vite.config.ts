import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB to handle the 4.52MB JS chunk
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
      manifest: {
        name: 'JPP POLISAS',
        short_name: 'JPP',
        description: 'Sistem Pengurusan JPP & Kelab POLISAS',
        theme_color: '#3b82f6',
        icons: [
          { src: 'jpp-logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'jpp-logo.png', sizes: '512x512', type: 'image/png' },
          { src: 'jpp-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
});