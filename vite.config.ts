import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repo-name>/.
// In dev we serve from root ('/'); in production build we use the subpath.
const BASE = '/schedule-app/'

export default defineConfig(({ command }) => {
  const base = command === 'build' ? BASE : '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        // scope & start_url must live under the subpath on GitHub Pages
        scope: base,
        manifest: {
          name: 'Time log',
          short_name: 'Time log',
          description: '1日の時間の使い方を記録・分析する自分専用アプリ',
          theme_color: '#FFF3B0',
          background_color: '#FFF3B0',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'ja',
          // relative to base -> resolves to <base> and <base>icon-*.png
          id: base,
          start_url: base,
          scope: base,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // SPA fallback must point at the base-prefixed index.html
          navigateFallback: base + 'index.html',
        },
      }),
    ],
  }
})
