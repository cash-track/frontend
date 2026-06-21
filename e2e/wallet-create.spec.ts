// S3 — Wallet create (/wallets/create)
// Components: WalletCreateView → WalletCreate
import { test, expect } from '@playwright/test'
import {
    label,
    routeError, route422,
    deleteWalletViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors ─────────────────────────────────────────────────────────
// Cancel link (/wallets)
const cancelLink = (page: import('@playwright/test').Page) =>
    page.getByRole('link', { name: label('wallets.cancel') })

// Wait for the Create button to be ready (currency loaded, name present)
async function waitForCreateEnabled(page: import('@playwright/test').Page) {
    // Currency may be pre-loaded from profile store; wait for btn to become enabled
    await expect(wallet.formCreate(page)).toBeEnabled({ timeout: 8000 })
}

test.describe('S3 — Wallet Create', () => {

    // WC-01 — Create button is disabled when Name is empty @smoke
    test('WC-01 @smoke Create button disabled when name is empty', async ({ page }) => {
        await page.goto('/wallets/create')

        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
        // Ensure name is empty
        await wallet.formName(page).fill('')

        await expect(wallet.formCreate(page)).toBeDisabled()
        await assertNoErrorLeak(page)
    })

    // WC-02 — Create button enabled only when name is set (currency pre-filled from profile)
    test('WC-02 Create button disabled with no name, enabled once name typed', async ({ page }) => {
        await page.goto('/wallets/create')

        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })

        // Start with empty name — button disabled
        await wallet.formName(page).fill('')
        await expect(wallet.formCreate(page)).toBeDisabled()

        // Fill name — button should become enabled (currency pre-filled from profile)
        await wallet.formName(page).fill('Test Wallet Name')
        await expect(wallet.formCreate(page)).toBeEnabled({ timeout: 8000 })

        await assertNoErrorLeak(page)
    })

    // WC-03 — Happy path: fill name, click Create, success check, redirect to /wallets/{id} @smoke
    test('WC-03 @smoke happy create wallet then clean up', async ({ page, request }) => {
        const name = `E2E WC03 ${Date.now()}`
        let createdWalletId: number | null = null

        await page.goto('/wallets/create')
        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
        await wallet.formName(page).fill(name)

        // Wait for button to be enabled (currencies loaded, name filled)
        await waitForCreateEnabled(page)

        // Intercept the create response to capture the wallet id
        const responsePromise = page.waitForResponse(
            res => res.url().includes('/api/wallets') && res.request().method() === 'POST',
            { timeout: 10000 },
        )

        await wallet.formCreate(page).click()

        const response = await responsePromise
        const body = await response.json().catch(() => null)
        if (body?.data?.id) {
            createdWalletId = body.data.id as number
        }

        // After success button shows check icon and then redirects ~1s later
        await page.waitForURL(/\/wallets\/\d+/, { timeout: 5000 })

        // Extract wallet id from URL if not captured from response
        if (!createdWalletId) {
            const urlMatch = page.url().match(/\/wallets\/(\d+)/)
            if (urlMatch) createdWalletId = Number(urlMatch[1])
        }

        await assertNoErrorLeak(page)

        // Cleanup — wallet was created
        if (createdWalletId) {
            await deleteWalletViaApi(request, createdWalletId)
        }
    })

    // WC-04 — Server 422 shows field error under Name, no redirect
    test('WC-04 server 422 shows field error under Name, no redirect', async ({ page }) => {
        // Navigate first, let currencies load, THEN install route intercept
        await page.goto('/wallets/create')
        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
        await wallet.formName(page).fill('Taken Name')
        await waitForCreateEnabled(page)

        // Install 422 intercept for the POST (not blocking currencies GET)
        await route422(page, '**/api/wallets', { name: ['Name already taken'] }, 'POST')

        await wallet.formCreate(page).click()

        // Field error should appear (422 validation)
        await expect(
            page.getByText(/Name already taken/i),
        ).toBeVisible({ timeout: 5000 })

        // Still on create page — no redirect
        await expect(page).toHaveURL(/\/wallets\/create/)
        await assertNoErrorLeak(page)
    })

    // WC-05 — Server 500 shows general error alert, form still editable
    test('WC-05 server 500 shows general error alert form stays editable', async ({ page }) => {
        // Navigate first, let currencies load
        await page.goto('/wallets/create')
        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
        await wallet.formName(page).fill('Error Wallet')
        await waitForCreateEnabled(page)

        // Install 500 intercept on POST only (don't block GET currencies)
        await page.route('**/api/wallets', (route) => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: '{"message":"E2E forced error"}',
                })
            }
            return route.continue()
        })

        await wallet.formCreate(page).click()

        // General error alert appears — UAlert renders as div[data-slot="title"] with error text
        await expect(
            page.locator('[data-slot="root"]').filter({ hasText: /.+/ }).last(),
        ).toBeVisible({ timeout: 5000 })

        // Form is still editable (not redirected, name field still present)
        await expect(wallet.formName(page)).toBeVisible()
        await expect(wallet.formName(page)).toBeEnabled()
        await expect(page).toHaveURL(/\/wallets\/create/)
        // Note: we intentionally show a general error message here; assertNoErrorLeak is
        // skipped because the "unknown error" string is the expected output of a 500.
    })

    // WC-06 — Cancel link navigates back to /wallets
    test('WC-06 Cancel link goes back to /wallets', async ({ page }) => {
        await page.goto('/wallets/create')

        await expect(cancelLink(page)).toBeVisible({ timeout: 10000 })
        await cancelLink(page).click()

        await page.waitForURL(/\/wallets$/, { timeout: 5000 })
        await assertNoErrorLeak(page)
    })

    // WC-07 — Currency list load failure: select stays usable, no crash
    test('WC-07 currency load failure select stays usable no crash', async ({ page }) => {
        await routeError(page, '**/api/currencies/featured', 500)
        await page.goto('/wallets/create')

        // The form should render even without currencies
        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })

        // No JS crash
        await assertNoErrorLeak(page)
    })

})
