// S20 — Error States (cross-cutting resilience)
// Centralizes routeError / routeAbort / 401 / 417 matrix so no page silently swallows failures.
//
// NOTE: ER-01..ER-05 are intentional-error tests → assertNoErrorLeak is NOT called in them
// (the app renders the translated error text which IS the expected outcome).
// ER-08 is the dedicated leak check against normal flows.
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError,
    createWalletViaApi, deleteWalletViaApi,
    assertNoErrorLeak,
} from './support'

// ── Local selectors ───────────────────────────────────────────────────────────

// UAlert rendered via :description (no role=alert in Nuxt UI — match data-slot="description")
const alertDescription = (page: import('@playwright/test').Page, text: RegExp) =>
    page.locator('[data-slot="description"]').filter({ hasText: text }).first()

// Generic text match (for alerts rendered with :title — WalletsActiveGridList uses :title)
const alertTitle = (page: import('@playwright/test').Page, text: RegExp) =>
    page.locator('[data-slot="title"]').filter({ hasText: text }).first()

// Retry button (retry key)
const retryBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('retry') })

// Nav shell still intact check
const navShellVisible = async (page: import('@playwright/test').Page) => {
    await expect(page.getByRole('link', { name: label('wallets.wallets') })).toBeVisible({ timeout: 5000 })
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('S20 — Error States', () => {

    // ER-01 — Wallets list 500 → wallets.listLoadingError
    // Intentional error test — do NOT call assertNoErrorLeak
    test('ER-01 wallets list 500 shows listLoadingError alert', async ({ page }) => {
        // The wallets list uses walletsStore.loadActive() → GET /api/wallets/unarchived
        await routeError(page, '**/api/wallets/unarchived')
        await page.goto('/wallets')

        const errorText = new RegExp(labelStrings('wallets.listLoadingError').join('|'), 'i')
        // WalletsActiveGridList renders error via :title (UAlert with v-else-if="failed" :title=...)
        await expect(alertTitle(page, errorText)).toBeVisible({ timeout: 10000 })

        // Shell must still be intact
        await navShellVisible(page)
    })

    // ER-02 — Wallet detail 500 → wallets.loadingError
    // Intentional error test — do NOT call assertNoErrorLeak
    test('ER-02 wallet detail 500 shows loadingError alert', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E ER02 ${Date.now()}` })
        try {
            // Only fail the primary GET for this wallet (exclude sub-resources)
            await page.route(`**/api/wallets/${w.id}`, route => {
                if (
                    route.request().method() === 'GET' &&
                    !route.request().url().includes('/total') &&
                    !route.request().url().includes('/users') &&
                    !route.request().url().includes('/tags') &&
                    !route.request().url().includes('/charges') &&
                    !route.request().url().includes('/limits')
                ) {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"E2E forced error"}',
                    })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}`)

            const errorText = new RegExp(labelStrings('wallets.loadingError').join('|'), 'i')
            // WalletView renders UAlert with :description="error" when load fails
            await expect(alertDescription(page, errorText)).toBeVisible({ timeout: 10000 })

            await navShellVisible(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // ER-03 — Charges 500 → charges.loadingError + Retry button
    // Intentional error test — do NOT call assertNoErrorLeak
    test('ER-03 charges 500 shows loadingError and Retry button', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E ER03 ${Date.now()}` })
        try {
            // Fail only the charges list endpoint
            await page.route(`**/api/wallets/${w.id}/charges*`, route => {
                if (route.request().method() === 'GET') {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"E2E forced error"}',
                    })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}`)

            // Wait for the wallet detail heading to render (wallet load itself succeeds)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            const errorText = new RegExp(labelStrings('charges.loadingError').join('|'), 'i')
            await expect(alertDescription(page, errorText)).toBeVisible({ timeout: 10000 })

            // Retry button must be present
            await expect(retryBtn(page)).toBeVisible()

            await navShellVisible(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // ER-04 — Tags 500 → tags.statsLoadingError + Retry button
    // Intentional error test — do NOT call assertNoErrorLeak
    test('ER-04 tags 500 shows statsLoadingError and Retry button', async ({ page }) => {
        await routeError(page, '**/api/tags')
        await page.goto('/tags')

        const errorText = new RegExp(labelStrings('tags.statsLoadingError').join('|'), 'i')
        // TagsView renders UAlert with :description="error"
        await expect(alertDescription(page, errorText)).toBeVisible({ timeout: 10000 })

        // Retry button
        await expect(retryBtn(page)).toBeVisible()

        await navShellVisible(page)
    })

    // ER-05 — Profile/stats 500 → section errors; shell intact
    // Intentional error test — do NOT call assertNoErrorLeak
    test('ER-05 profile stats 500 shows section error; shell intact', async ({ page }) => {
        // ChargesFlowStatistics calls GET /api/profile/statistics/charges-flow
        // Force it to return 500 before navigation
        await routeError(page, '**/api/profile/statistics/charges-flow')
        await page.goto('/profile')

        // App shell must still render
        await navShellVisible(page)

        // ChargesFlowStatistics renders profile.chargesFlowLoadingError in UAlert :title=
        // The UAlert renders :title in [data-slot="title"]
        const errorText = new RegExp(labelStrings('profile.chargesFlowLoadingError').join('|'), 'i')
        await expect(
            page.locator('[data-slot="title"]').filter({ hasText: errorText }).first()
        ).toBeVisible({ timeout: 10000 })
    })

    // ER-06 — Global 401: apiCall interceptor redirects window to website /login
    // The gateway is at https://gateway.dev-cash-track.app; the website is at https://dev-cash-track.app
    test('ER-06 401 response redirects to website login page', async ({ page }) => {
        // Force 401 on a request that will fire when the page loads
        // The profile is loaded by App.vue on mount → GET /api/profile
        await page.route('**/api/profile', route => {
            return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
        })

        // Navigate; the 401 interceptor sets window.location.href = webSiteLink('/login')
        // which is https://dev-cash-track.app/login (VITE_WEBSITE_URL + /login)
        await page.goto('/wallets')

        // The page should navigate away to the website login — wait for that URL
        // The navigation to an external URL (https://dev-cash-track.app/login) may
        // fail with ERR_NAME_NOT_RESOLVED if the website is down, but the redirect
        // attempt itself is what we assert.
        try {
            await page.waitForURL(/dev-cash-track\.app\/login/, { timeout: 8000 })
            // If we get here the redirect worked perfectly
        } catch {
            // The URL may not fully load if the website is not up, but we can check
            // that we've left the SPA origin — the page should no longer be at /wallets
            const currentUrl = page.url()
            // Either redirected to login, OR still loading (navigation in progress)
            // The axios interceptor fires synchronously so the href assignment happens
            // before the page fully renders — verify we left the original SPA URL
            expect(currentUrl).not.toMatch(/my\.dev-cash-track\.app\/wallets/)
        }
        // NOTE: intentional redirect — no assertNoErrorLeak here
    })

    // ER-07 — 417 CSRF retry: first mutating call returns 417 → GET /csrf fires once → retry succeeds
    // Uses wallet Disable action (POST /wallets/{id}/disable) — fires directly without a confirm modal.
    test('ER-07 @smoke 417 triggers CSRF rotation then retry succeeds', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E ER07 ${Date.now()}` })
        try {
            let postCallCount = 0

            // Make the first POST to wallet disable return 417 (CsrfError), then let through
            await page.route(`**/api/wallets/${w.id}/disable`, route => {
                if (route.request().method() === 'POST') {
                    postCallCount++
                    if (postCallCount === 1) {
                        return route.fulfill({
                            status: 417,
                            contentType: 'application/json',
                            body: '{"message":"CSRF token mismatch"}',
                        })
                    }
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            // Open more-actions dropdown and click Disable
            // WalletHeader: onDisable() calls disableWallet() directly — no confirm modal
            await page.getByRole('button', { name: label('wallets.moreActions') }).click()
            await expect(page.getByRole('menuitem', { name: label('wallets.disable') })).toBeVisible({ timeout: 5000 })

            // Wait for the SUCCESSFUL retry (status 200 after 417 → CSRF rotation → retry)
            const successResponsePromise = page.waitForResponse(
                r => r.url().includes(`/wallets/${w.id}/disable`) && r.request().method() === 'POST' && r.status() === 200,
                { timeout: 15000 },
            )

            await page.getByRole('menuitem', { name: label('wallets.disable') }).click()

            // Wait for the retry to succeed
            await successResponsePromise

            // Verify the POST was called at least twice (417 attempt + retry)
            expect(postCallCount).toBe(2)

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // ER-08 — No "Unknown error" leakage across normal flows
    // Checks that the body never shows raw unknownError text in healthy states
    test('ER-08 @smoke normal flows never show raw unknownError text', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E ER08 ${Date.now()}` })
        try {
            // /wallets list
            await page.goto('/wallets')
            await expect(page.locator('body')).not.toContainText('Unknown error')
            await expect(page.locator('body')).not.toContainText('Невідома помилка')

            // /tags
            await page.goto('/tags')
            await expect(page.locator('body')).not.toContainText('Unknown error')
            await expect(page.locator('body')).not.toContainText('Невідома помилка')

            // /profile
            await page.goto('/profile')
            await expect(page.locator('body')).not.toContainText('Unknown error')
            await expect(page.locator('body')).not.toContainText('Невідома помилка')

            // wallet detail
            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.locator('body')).not.toContainText('Unknown error')
            await expect(page.locator('body')).not.toContainText('Невідома помилка')

            // /settings
            await page.goto('/settings')
            await expect(page.locator('body')).not.toContainText('Unknown error')
            await expect(page.locator('body')).not.toContainText('Невідома помилка')
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

})
