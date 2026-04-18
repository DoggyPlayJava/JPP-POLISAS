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
      // Use injectManifest so our sw.ts handles push events
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
      manifest: {
        name: 'JPP POLISAS',
        short_name: 'JPP',
        description: 'Sistem Pengurusan JPP & Kelab POLISAS',
        theme_color: '#3b82f6',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/portal',
        icons: [
          { src: 'jpp-logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'jpp-logo.png', sizes: '512x512', type: 'image/png' },
          { src: 'jpp-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'jpp-logo.png'],
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