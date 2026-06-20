import { registerSW } from 'virtual:pwa-register'

export function setupPWA() {
    registerSW({ immediate: true })
}
