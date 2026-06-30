import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'apple.png', '32.png', 'favicon.ico'],
      manifest: {
        name: 'SIMIGUM',
        short_name: 'SIMIGUM',
        description: 'Aplikasi pencatatan dan manajemen inventaris gudang',
        theme_color: '#0f3430', 
        background_color: '#ffffff', 
        display: 'standalone', 
        icons: [
          {
            src: '192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});