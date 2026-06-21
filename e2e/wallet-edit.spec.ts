// S4 — Wallet edit (/wallets/:id/edit)
// Components: WalletEditView → WalletEdit (+ ConfirmModal)
import { test, expect } from '@playwright/test'
import {
    label,
    route422,
    createWalletViaApi, deleteWalletViaApi,
    wallet, overlay, assertNoErrorLeak,
} from './support'

// ── Local selectors ─────────────────────────────────────────────────────────
// Delete button in the WalletEdit card header
const deleteButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('wallets.delete') })

// Cancel link in the edit form footer
const cancelLink = (page: import('@playwright/test').Page) =>
    page.getByRole('link', { name: label('wallets.cancel') })

test.describe('S4 — Wallet Edit', () => {

    // WE-01 — Prefilled form shows wallet name and currency @smoke
    test('WE-01 @smoke form is prefilled with wallet name and currency', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE01 ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        try {
            await page.goto(`/wallets/${seeded.id}/edit`)

            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
            // Name is pre-filled
            await expect(wallet.formName(page)).toHaveValue(seeded.name)
            // Currency select has a displayed value — Nuxt UI USelect uses SelectTrigger (button),
            // the selected label appears in [data-slot="value"]
            await expect(page.locator('[data-slot="value"]').first()).toBeVisible()
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WE-02 — Update happy path: change name → Update → success check → redirect to /wallets/{id} @smoke
    test('WE-02 @smoke update wallet name and redirect to detail', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE02 ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        const newName = `E2E WE02 Updated ${Date.now()}`
        try {
            await page.goto(`/wallets/${seeded.id}/edit`)

            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
            await wallet.formName(page).fill(newName)
            await wallet.formUpdate(page).click()

            // After success ~1s redirect to /wallets/{id}
            await page.waitForURL(new RegExp(`/wallets/${seeded.id}$`), { timeout: 5000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WE-03a — 422 validation error on update shows field error
    test('WE-03a server 422 shows field error on update', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE03a ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        try {
            await route422(
                page,
                `**/api/wallets/${seeded.id}`,
                { name: ['Name already taken'] },
                'PUT',
            )
            await page.goto(`/wallets/${seeded.id}/edit`)

            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
            await wallet.formName(page).fill('Taken Name')
            await wallet.formUpdate(page).click()

            await expect(page.getByText(/Name already taken/i)).toBeVisible({ timeout: 5000 })
            await expect(page).toHaveURL(new RegExp(`/wallets/${seeded.id}/edit`))
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WE-03b — 500 error on update shows general error
    test('WE-03b server 500 shows general error alert on update', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE03b ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        try {
            // Navigate FIRST so the GET /api/wallets/{id} loads the form correctly,
            // THEN install the PUT intercept before clicking Update
            await page.goto(`/wallets/${seeded.id}/edit`)
            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
            await wallet.formName(page).fill('Error Name')

            // Install 500 on PUT only after the form is loaded
            await page.route(`**/api/wallets/${seeded.id}`, (route) => {
                if (route.request().method() === 'PUT') {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"E2E forced error"}',
                    })
                }
                return route.continue()
            })

            await wallet.formUpdate(page).click()

            // UAlert has no role="alert"; it renders as div[data-slot="root"]
            // The generalError description appears in [data-slot="description"]
            await expect(
                page.locator('[data-slot="description"]').first(),
            ).toBeVisible({ timeout: 5000 })
            await expect(page).toHaveURL(new RegExp(`/wallets/${seeded.id}/edit`))
            // Skip assertNoErrorLeak — 500 intentionally surfaces the unknown-error text
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WE-04 — Delete button opens ConfirmModal with deletingConfirm text; Cancel closes it
    test('WE-04 Delete button opens ConfirmModal Cancel closes it', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE04 ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        try {
            await page.goto(`/wallets/${seeded.id}/edit`)

            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })
            await deleteButton(page).click()

            // ConfirmModal dialog opens
            await expect(overlay.dialog(page)).toBeVisible({ timeout: 5000 })

            // Dialog contains the wallet name (deletingConfirm has wallet name substituted)
            await expect(overlay.dialog(page)).toContainText(seeded.name, { timeout: 5000 })

            // Cancel closes the dialog — WalletEdit passes cancelLabel=t('wallets.cancel')
            // which may differ from common.cancel in Ukrainian. Use wallets.cancel label.
            await overlay.dialog(page)
                .getByRole('button', { name: label('wallets.cancel') })
                .click()
            await expect(overlay.dialog(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WE-05 — Confirm delete → DELETE request → redirect to /wallets @smoke
    test('WE-05 @smoke confirm delete redirects to /wallets', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE05 ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })

        await page.goto(`/wallets/${seeded.id}/edit`)
        await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })

        await deleteButton(page).click()
        await expect(overlay.dialog(page)).toBeVisible({ timeout: 5000 })

        // Intercept DELETE
        const deleteRequestPromise = page.waitForRequest(
            req =>
                req.url().includes(`/api/wallets/${seeded.id}`) &&
                req.method() === 'DELETE',
            { timeout: 10000 },
        )

        await overlay.confirmDelete(page).click()
        await deleteRequestPromise

        // Redirect to /wallets
        await page.waitForURL(/\/wallets$/, { timeout: 10000 })
        await assertNoErrorLeak(page)
        // Wallet was deleted — no cleanup needed
    })

    // WE-06 — Delete error: 500 on DELETE → modal shows error, stays usable
    test('WE-06 delete error shows error in modal stays usable', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE06 ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        try {
            // Force the DELETE to fail
            await page.route(
                `**/api/wallets/${seeded.id}`,
                (route) => {
                    if (route.request().method() === 'DELETE') {
                        return route.fulfill({
                            status: 500,
                            contentType: 'application/json',
                            body: '{"message":"E2E forced delete error"}',
                        })
                    }
                    return route.continue()
                },
            )

            await page.goto(`/wallets/${seeded.id}/edit`)
            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })

            await deleteButton(page).click()
            await expect(overlay.dialog(page)).toBeVisible({ timeout: 5000 })

            await overlay.confirmDelete(page).click()

            // After error: modal closes, generalError displayed in the form (div[data-slot="description"])
            // Also: dialog should close
            await expect(overlay.dialog(page)).not.toBeVisible({ timeout: 5000 })

            // General error alert appears — UAlert renders description in [data-slot="description"]
            await expect(
                page.locator('[data-slot="description"]').first(),
            ).toBeVisible({ timeout: 5000 })

            // Form is still on the edit page (stays usable)
            await expect(page).toHaveURL(new RegExp(`/wallets/${seeded.id}/edit`))
            // Skip assertNoErrorLeak — app intentionally shows an error message here
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WE-07 — Cancel link navigates to /wallets/{id}
    test('WE-07 Cancel link navigates to wallet detail', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, {
            name: `E2E WE07 ${Date.now()}`,
            defaultCurrencyCode: 'USD',
        })
        try {
            await page.goto(`/wallets/${seeded.id}/edit`)
            await expect(wallet.formName(page)).toBeVisible({ timeout: 10000 })

            await cancelLink(page).click()

            await page.waitForURL(new RegExp(`/wallets/${seeded.id}$`), { timeout: 5000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

})
