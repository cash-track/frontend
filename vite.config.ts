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
        // Icons are embedded into the bundle at build time instead of being fetched
        // from api.iconify.design on first render. Nuxt UI's own icons come from its
        // default icon map automatically; `scan` picks up the ones referenced in our
        // own code. The glob is deliberately every file under src/ — the default
        // (`**/*.{vue,jsx,tsx,md,...}`) skips .ts, where useNotifications keeps its
        // toast icons. Collections must be installed locally (@iconify-json/*) or
        // their icons silently fall through to the API.
        ui({
            icon: {
                clientBundle: {
                    scan: {
                        globInclude: ['src/**/*'],
                        globExclude: ['**/__tests__/**'],
                    },
                },
            },
        }),
        vueDevTools(),
        // Precache the app shell only (hashed JS/CSS/HTML).
        // The API is a different origin (gateway) so it is never precached;
        // navigateFallbackDenylist keeps any /api path off the SPA fallback.
        VitePWA({
            // Prompt mode: a new service worker installs and waits; src/pwa.ts
            // surfaces needRefresh so the UI can ask the user before activating
            // it (updateApp() posts SKIP_WAITING). autoUpdate would activate
            // silently, but with injectRegister: false its unconditional
            // self.skipWaiting() is never wired in, so updates never applied.
            registerType: 'prompt',
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
        alias: [
            { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
            // The default @iconify/vue entry keeps an HTTP fallback that fetches any
            // unregistered icon from api.iconify.design. The offline entry drops that
            // code path entirely, so a bundling gap shows up as a blank icon rather
            // than a silent third-party request. Nuxt UI only imports Icon and
            // addIcon; the shim re-exports both and bridges the colon/dash icon-name
            // difference the offline entry does not normalise (see the file).
            {
                find: /^@iconify\/vue$/,
                replacement: fileURLToPath(new URL('./src/shared/iconify-offline.ts', import.meta.url)),
            },
        ],
    },
})
