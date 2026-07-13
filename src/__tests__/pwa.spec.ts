import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RegisterSWOptions } from 'virtual:pwa-register'

// Shim the virtual module so vitest can resolve it outside the vite-plugin-pwa build pipeline.
const { mockUpdateSW, mockRegisterSW } = vi.hoisted(() => {
    const mockUpdateSW = vi.fn(async (_reloadPage?: boolean) => {})
    const mockRegisterSW = vi.fn((_options?: unknown) => mockUpdateSW)
    return { mockUpdateSW, mockRegisterSW }
})
vi.mock('virtual:pwa-register', () => ({ registerSW: mockRegisterSW }))

function makeRegistration(update: () => Promise<void>) {
    return { update: vi.fn(update) } as unknown as ServiceWorkerRegistration
}

async function loadPwa() {
    vi.resetModules()
    return import('../pwa')
}

function registeredOptions(): RegisterSWOptions {
    const call = mockRegisterSW.mock.calls.at(-1)
    return call![0] as RegisterSWOptions
}

describe('pwa', () => {
    beforeEach(() => {
        mockRegisterSW.mockClear()
        mockUpdateSW.mockClear()
        sessionStorage.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('setupPWA() registers the service worker with immediate:true and all handlers wired', async () => {
        const { setupPWA } = await loadPwa()
        setupPWA()

        expect(mockRegisterSW).toHaveBeenCalledTimes(1)
        const options = registeredOptions()
        expect(options.immediate).toBe(true)
        expect(typeof options.onNeedRefresh).toBe('function')
        expect(typeof options.onRegisteredSW).toBe('function')
        expect(typeof options.onRegisterError).toBe('function')
    })

    it('onNeedRefresh flips needRefresh to true', async () => {
        const pwa = await loadPwa()
        pwa.setupPWA()
        const { needRefresh } = pwa.usePWAUpdate()

        expect(needRefresh.value).toBe(false)
        registeredOptions().onNeedRefresh!()
        expect(needRefresh.value).toBe(true)
    })

    it('updateApp() invokes the updateSW function returned by registerSW', async () => {
        const pwa = await loadPwa()
        pwa.setupPWA()

        await pwa.updateApp()

        expect(mockUpdateSW).toHaveBeenCalledExactlyOnceWith(true)
    })

    it('updateApp() is a no-op when called before setupPWA()', async () => {
        const pwa = await loadPwa()

        await expect(pwa.updateApp()).resolves.toBeUndefined()
        expect(mockUpdateSW).not.toHaveBeenCalled()
    })

    it('onRegisterError swallows the error without throwing', async () => {
        const pwa = await loadPwa()
        pwa.setupPWA()

        expect(() => registeredOptions().onRegisterError!(new Error('registration failed'))).not.toThrow()
    })

    describe('onRegisteredSW', () => {
        it('does nothing when registration is undefined', async () => {
            const pwa = await loadPwa()
            pwa.setupPWA()

            expect(() => registeredOptions().onRegisteredSW!('sw.js', undefined)).not.toThrow()
        })

        it('polls registration.update() every 60 minutes', async () => {
            vi.useFakeTimers()
            const pwa = await loadPwa()
            pwa.setupPWA()

            const registration = makeRegistration(async () => {})
            registeredOptions().onRegisteredSW!('sw.js', registration)

            expect(registration.update).not.toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
            expect(registration.update).toHaveBeenCalledTimes(1)

            await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
            expect(registration.update).toHaveBeenCalledTimes(2)
        })

        it('swallows registration.update() rejections from the interval check', async () => {
            vi.useFakeTimers()
            const pwa = await loadPwa()
            pwa.setupPWA()

            const registration = makeRegistration(async () => {
                throw new Error('offline')
            })
            registeredOptions().onRegisteredSW!('sw.js', registration)

            // If the rejection weren't swallowed in source, this would surface
            // as an unhandled rejection and fail the test.
            await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
            expect(registration.update).toHaveBeenCalledTimes(1)
        })

        it('calls registration.update() when the document becomes visible', async () => {
            const pwa = await loadPwa()
            pwa.setupPWA()

            const registration = makeRegistration(async () => {})
            registeredOptions().onRegisteredSW!('sw.js', registration)

            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
            document.dispatchEvent(new Event('visibilitychange'))

            expect(registration.update).toHaveBeenCalledTimes(1)
        })

        it('does not call registration.update() while the document is hidden', async () => {
            const pwa = await loadPwa()
            pwa.setupPWA()

            const registration = makeRegistration(async () => {})
            registeredOptions().onRegisteredSW!('sw.js', registration)

            Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
            document.dispatchEvent(new Event('visibilitychange'))

            expect(registration.update).not.toHaveBeenCalled()
        })

        it('swallows registration.update() rejections from the visibilitychange check', async () => {
            const pwa = await loadPwa()
            pwa.setupPWA()

            const registration = makeRegistration(async () => {
                throw new Error('offline')
            })
            registeredOptions().onRegisteredSW!('sw.js', registration)

            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
            expect(() => document.dispatchEvent(new Event('visibilitychange'))).not.toThrow()
        })
    })

    describe('vite:preloadError handling', () => {
        // jsdom's Location#reload is non-configurable/non-writable, so it can't be
        // spied on directly (vi.spyOn throws "Cannot redefine property: reload").
        // window's own `location` property IS configurable, so swap the whole
        // object out for the duration of the test and restore it afterwards.
        const originalLocation = window.location

        function mockLocationReload() {
            const reloadSpy = vi.fn()
            Object.defineProperty(window, 'location', {
                value: { reload: reloadSpy },
                writable: true,
                configurable: true,
            })
            return reloadSpy
        }

        afterEach(() => {
            Object.defineProperty(window, 'location', {
                value: originalLocation,
                writable: true,
                configurable: true,
            })
        })

        it('reloads the page once and stores the reload timestamp', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(1_700_000_000_000)
            const reloadSpy = mockLocationReload()
            const pwa = await loadPwa()
            pwa.setupPWA()

            window.dispatchEvent(new Event('vite:preloadError'))

            expect(reloadSpy).toHaveBeenCalledTimes(1)
            expect(sessionStorage.getItem('ct:preloadErrorReloadedAt')).toBe('1700000000000')
        })

        it('does not reload a second time for a second preload error in the same load', async () => {
            const reloadSpy = mockLocationReload()
            const pwa = await loadPwa()
            pwa.setupPWA()

            window.dispatchEvent(new Event('vite:preloadError'))
            window.dispatchEvent(new Event('vite:preloadError'))

            expect(reloadSpy).toHaveBeenCalledTimes(1)
        })

        // This is the scenario the guard exists for: a reload doesn't clear
        // sessionStorage (it survives navigation in the same tab), so a second,
        // independent page load that hits vite:preloadError again shortly after
        // must not retrigger a reload — otherwise a persistent failure (a chunk
        // missing from the CDN, a flaky network) loops forever.
        it('does not reload again on the next page load within the cooldown window', async () => {
            vi.useFakeTimers()
            const reloadSpy = mockLocationReload()

            // Load 1: a preload error triggers the guarded reload.
            const load1 = await loadPwa()
            load1.setupPWA()
            window.dispatchEvent(new Event('vite:preloadError'))
            expect(reloadSpy).toHaveBeenCalledTimes(1)

            // Load 2 (simulated page reload): fresh module state, but
            // sessionStorage — and therefore the cooldown — survives.
            const load2 = await loadPwa()
            load2.setupPWA()
            window.dispatchEvent(new Event('vite:preloadError'))

            expect(reloadSpy).toHaveBeenCalledTimes(1)
        })

        it('reloads again on a later page load once the cooldown window has elapsed', async () => {
            vi.useFakeTimers()
            const reloadSpy = mockLocationReload()

            const load1 = await loadPwa()
            load1.setupPWA()
            window.dispatchEvent(new Event('vite:preloadError'))
            expect(reloadSpy).toHaveBeenCalledTimes(1)

            await vi.advanceTimersByTimeAsync(60 * 1000 + 1)

            const load2 = await loadPwa()
            load2.setupPWA()
            window.dispatchEvent(new Event('vite:preloadError'))

            expect(reloadSpy).toHaveBeenCalledTimes(2)
        })
    })
})
