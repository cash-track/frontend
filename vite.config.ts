import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        ui(),
        vueDevTools(),
        // Precache the app shell only (hashed JS/CSS/HTML).
        // The API is a different origin (gateway) so it is never precached;
        // navigateFallbackDenylist keeps any /api path off the SPA fallback.
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false,        // we register manually (see src/pwa.ts)
            manifest: false,              // keep the static public/site.webmanifest
            workbox: {
                globPatterns: ['**/*.{js,css,html}'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api/],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
            },
            devOptions: { enabled: false },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
