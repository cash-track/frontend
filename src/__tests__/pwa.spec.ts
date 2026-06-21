import { describe, it, expect, vi } from 'vitest'

// Shim the virtual module so vitest can resolve it outside the vite-plugin-pwa build pipeline.
vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }))

import { registerSW } from 'virtual:pwa-register'
import { setupPWA } from '../pwa'

describe('setupPWA', () => {
    it('calls registerSW with { immediate: true }', () => {
        setupPWA()
        expect(registerSW).toHaveBeenCalledExactlyOnceWith({ immediate: true })
    })
})
