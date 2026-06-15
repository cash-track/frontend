// S6 — Wallet actions (more-actions dropdown from WalletHeader)
// Cases: WA-01..WA-08
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError,
    createWalletViaApi, deleteWalletViaApi, disableWalletViaApi,
    wallet, overlay, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────
// Share menu item
const menuShare = (page: import('@playwright/test').Page) =>
    page.getByRole('menuitem', { name: label('wallets.share') })

// Activate menu item
const menuActivate = (page: import('@playwright/test').Page) =>
    page.getByRole('menuitem', { name: label('wallets.activate') })

// Disable menu item
const menuDisable = (page: import('@playwright/test').Page) =>
    page.getByRole('menuitem', { name: label('wallets.disable') })

// To Archive menu item
const menuToArchive = (page: import('@playwright/test').Page) =>
    page.getByRole('menuitem', { name: label('wallets.toArchive') })

// Un Archive menu item
const menuUnArchive = (page: import('@playwright/test').Page) =>
    page.getByRole('menuitem', { name: label('wallets.unArchive') })

// Delete menu item
const menuDelete = (page: import('@playwright/test').Page) =>
    page.getByRole('menuitem', { name: label('wallets.delete') })

// Status badges
const activeBadge = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.active')).first()

const archivedBadge = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.archived')).first()

// A generic toast/notification — Nuxt UI renders role=alert for notifications
const errorToast = (page: import('@playwright/test').Page, pattern: RegExp) =>
    page.getByRole('alert').filter({ hasText: pattern }).first()

// Delete confirm button inside the modal (uses confirmLabel = 'wallets.delete')
const modalConfirmDelete = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByRole('button', { name: label('wallets.delete') })

// Cancel button in WalletHeader's ConfirmModal — uses wallets.cancel, NOT common.cancel
// (common.cancel='Скасувати' but wallets.cancel='Відміна' in Ukrainian)
const modalCancelWallet = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByRole('button', { name: label('wallets.cancel') })

// The deleteError text inside the modal — search page-wide (UModal is teleported)
const modalDeleteError = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('wallets.deleteError').join('|'), 'i')).first()

async function openMoreActions(page: import('@playwright/test').Page) {
    await wallet.moreActions(page).click()
}

test.describe('S6 — Wallet Actions', () => {

    // WA-01 — Open more-actions menu: expected items present
    test('WA-01 @smoke more-actions menu shows expected items', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA01 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            await openMoreActions(page)

            // Share item
            await expect(menuShare(page)).toBeVisible({ timeout: 3000 })
            // Active wallet → Disable item visible
            await expect(menuDisable(page)).toBeVisible()
            // To Archive item
            await expect(menuToArchive(page)).toBeVisible()
            // Delete item
            await expect(menuDelete(page)).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WA-02 — Share navigates to /wallets/{id}/share
    test('WA-02 @smoke Share item navigates to share page', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA02 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            await openMoreActions(page)
            await menuShare(page).click()

            await page.waitForURL(new RegExp(`/wallets/${w.id}/share`), { timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WA-03 — Disable active wallet → badge/state updates
    test('WA-03 Disable active wallet updates status badge', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA03 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Intercept the disable POST to verify method + path
            const disableReq = page.waitForRequest(
                req => req.url().includes(`/api/wallets/${w.id}/disable`) && req.method() === 'POST',
                { timeout: 10000 },
            )

            await openMoreActions(page)
            await menuDisable(page).click()

            await disableReq

            // After disable → wallet reloads → isActive=false → active badge gone
            // and New Charge button hidden (v-if="wallet.isActive")
            await expect(activeBadge(page)).not.toBeVisible({ timeout: 10000 })
            await expect(
                page.getByRole('button', { name: label('charges.new') }),
            ).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            // Already disabled — still delete cleanly
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WA-04 — Activate inactive wallet → state flips to active
    test('WA-04 Activate inactive wallet flips status to active', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA04 ${Date.now()}` })
        try {
            await disableWalletViaApi(request, w.id)

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Disabled wallet → Activate item visible
            await openMoreActions(page)
            await expect(menuActivate(page)).toBeVisible({ timeout: 3000 })

            const activateReq = page.waitForRequest(
                req => req.url().includes(`/api/wallets/${w.id}/activate`) && req.method() === 'POST',
                { timeout: 10000 },
            )
            await menuActivate(page).click()
            await activateReq

            // After activate → active badge appears
            await expect(activeBadge(page)).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WA-05 — Archive then Unarchive toggles archived state
    test('WA-05 Archive and Unarchive toggles archived state', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA05 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // --- Archive ---
            await openMoreActions(page)
            await expect(menuToArchive(page)).toBeVisible({ timeout: 3000 })
            const archiveReq = page.waitForRequest(
                req => req.url().includes(`/api/wallets/${w.id}/archive`) && req.method() === 'POST',
                { timeout: 10000 },
            )
            await menuToArchive(page).click()
            await archiveReq

            // Archived badge appears
            await expect(archivedBadge(page)).toBeVisible({ timeout: 10000 })

            // --- Unarchive ---
            await openMoreActions(page)
            await expect(menuUnArchive(page)).toBeVisible({ timeout: 3000 })
            const unarchiveReq = page.waitForRequest(
                req => req.url().includes(`/api/wallets/${w.id}/un-archive`) && req.method() === 'POST',
                { timeout: 10000 },
            )
            await menuUnArchive(page).click()
            await unarchiveReq

            // Archived badge gone after unarchive
            await expect(archivedBadge(page)).not.toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WA-06 — Action API error → notifyError toast
    test('WA-06 action API error shows error notification', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA06 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Force disable to 500
            await routeError(page, `**/api/wallets/${w.id}/disable`)

            await openMoreActions(page)
            await menuDisable(page).click()

            // Expect the disableError notification
            const disableErrorPattern = new RegExp(
                labelStrings('wallets.disableError').join('|'),
                'i',
            )
            await expect(errorToast(page, disableErrorPattern)).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WA-07 — Delete → ConfirmModal → confirm → redirect to /wallets
    test('WA-07 @smoke Delete opens ConfirmModal, confirm redirects to /wallets', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA07 ${Date.now()}` })
        // Don't wrap in try/finally: if delete succeeds, wallet is already gone
        await page.goto(`/wallets/${w.id}`)
        await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

        // Open menu and click Delete
        await openMoreActions(page)
        await menuDelete(page).click()

        // ConfirmModal should appear
        await expect(overlay.dialog(page)).toBeVisible({ timeout: 3000 })

        // Cancel should close the modal — ConfirmModal here uses wallets.cancel label
        await modalCancelWallet(page).click()
        await expect(overlay.dialog(page)).not.toBeVisible({ timeout: 3000 })

        // Open again and confirm deletion
        await openMoreActions(page)
        await menuDelete(page).click()
        await expect(overlay.dialog(page)).toBeVisible({ timeout: 3000 })

        await modalConfirmDelete(page).click()

        // Should redirect to /wallets
        await page.waitForURL(/\/wallets$/, { timeout: 10000 })
        await assertNoErrorLeak(page)
    })

    // WA-08 — Delete modal: server error shows deleteError in modal, button shows loading then releases
    test('WA-08 delete server error shows deleteError in modal', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WA08 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Force DELETE to 500 — only intercept DELETE method, let GETs through
            await page.route(`**/api/wallets/${w.id}`, route => {
                if (route.request().method() === 'DELETE') {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"forced error"}',
                    })
                }
                return route.continue()
            })

            await openMoreActions(page)
            await menuDelete(page).click()

            // Modal visible
            await expect(overlay.dialog(page)).toBeVisible({ timeout: 3000 })

            // Click confirm
            await modalConfirmDelete(page).click()

            // deleteError alert appears inside the modal
            await expect(modalDeleteError(page)).toBeVisible({ timeout: 10000 })

            // Modal stays open (didn't redirect)
            await expect(overlay.dialog(page)).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

})
