import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

// How often to poll for a new service worker while the tab stays open.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

// Guards against a vite:preloadError reload loop (e.g. a stale tab that keeps
// hitting a deleted hashed chunk). sessionStorage holds the timestamp of the
// last such reload, which survives the reload itself (same tab) — so a second
// preload error on the very next load only reloads again once the cooldown has
// elapsed. That way a genuine one-off staleness case still recovers immediately
// (no prior timestamp), while a persistent failure (chunk missing from the CDN,
// flaky network) can't retrigger a reload on every single load.
const PRELOAD_ERROR_RELOAD_KEY = 'ct:preloadErrorReloadedAt'
const PRELOAD_ERROR_RELOAD_COOLDOWN_MS = 60 * 1000

// Reactive flag flipped by onNeedRefresh once a new service worker is waiting.
const needRefresh = ref(false)

// Set by setupPWA(); calling it posts SKIP_WAITING to the waiting worker. The
// page reload itself is handled by the pwa client once the new worker takes
// control (see workbox-window's "controlling" listener) — we never reload here.
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined

export function usePWAUpdate() {
    return { needRefresh, updateApp }
}

export async function updateApp() {
    if (!updateSWFn) {
        return
    }
    await updateSWFn(true)
}

function onNeedRefresh() {
    needRefresh.value = true
}

function checkForUpdate(registration: ServiceWorkerRegistration) {
    registration.update().catch(() => {})
}

function onRegisteredSW(_swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (!registration) {
        return
    }

    setInterval(() => checkForUpdate(registration), UPDATE_CHECK_INTERVAL_MS)

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkForUpdate(registration)
        }
    })
}

function onRegisterError() {
    // A failed service worker registration must never break the app.
}

function onPreloadError() {
    const lastReloadAt = Number(sessionStorage.getItem(PRELOAD_ERROR_RELOAD_KEY) ?? 0)
    if (Date.now() - lastReloadAt < PRELOAD_ERROR_RELOAD_COOLDOWN_MS) {
        return
    }
    sessionStorage.setItem(PRELOAD_ERROR_RELOAD_KEY, String(Date.now()))
    window.location.reload()
}

export function setupPWA() {
    updateSWFn = registerSW({ immediate: true, onNeedRefresh, onRegisteredSW, onRegisterError })
    window.addEventListener('vite:preloadError', onPreloadError)
}
