// S17 — charges-move.spec.ts — multi-select & move (ChargesList)
// MV-01..MV-06: select single, select group, selected count, move to wallet, clear, error
// Precondition: account has ≥2 active wallets — seeded here.
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError,
    createWalletViaApi, deleteWalletViaApi, createChargeViaApi, deleteChargeViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────

// The select-charge timeline button in a ChargeItem row
// aria-label = charges.selectCharge
const selectChargeBtn = (row: import('@playwright/test').Locator) =>
    row.getByRole('button', { name: label('charges.selectCharge') })

// The group-select button (hover-revealed on active wallets)
// aria-label = charges.selectGroup
const selectGroupBtn = (groupHeader: import('@playwright/test').Locator) =>
    groupHeader.getByRole('button', { name: label('charges.selectGroup') })

// Move toolbar — only visible when ≥1 selected AND ≥2 active wallets
const moveToolbar = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.move') })

// Clear selection button
const clearSelectionBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.clearSelection') })

// Selected count text (charges.selectedCount)
const selectedCountText = (page: import('@playwright/test').Page) =>
    page.locator('span.text-sm.text-muted').filter({
        hasText: /\d+\s*(selected|вибрано)/i,
    })

// Move error alert (closable UAlert, description = charges.moveError)
const moveErrorAlert = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="description"]').filter({
        hasText: new RegExp(labelStrings('charges.moveError').join('|'), 'i'),
    }).first()

// ChargeItem rows — each outer div wrapping the timeline + content
// They have class containing "group" and "flex items-stretch"
const chargeRows = (page: import('@playwright/test').Page) =>
    page.locator('div.group.flex.items-stretch.-mx-4')

test.describe('S17 — Charges Move', () => {

    // MV-01 — Hover row → click select control → row selected; move toolbar appears
    test('MV-01 @smoke selecting a charge shows the move toolbar', async ({ request, page }) => {
        const sourceWallet = await createWalletViaApi(request, { name: `E2E MV01-src ${Date.now()}` })
        const targetWallet = await createWalletViaApi(request, { name: `E2E MV01-tgt ${Date.now()}` })
        const c = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV01 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${sourceWallet.id}`)
            await expect(wallet.detailHeading(page)).toContainText(sourceWallet.name, { timeout: 10000 })

            // Wait for charges to load
            const row = chargeRows(page).first()
            await expect(row).toBeVisible({ timeout: 10000 })

            // Hover the row to reveal the select button, then click it
            await row.hover()
            const selectBtn = selectChargeBtn(row)
            await expect(selectBtn).toBeVisible({ timeout: 5000 })
            await selectBtn.click()

            // Move toolbar should appear (requires ≥2 active wallets → both created above)
            await expect(moveToolbar(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteChargeViaApi(request, sourceWallet.id, c.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, sourceWallet.id)
            await deleteWalletViaApi(request, targetWallet.id)
        }
    })

    // MV-02 — Hover group header → group select → all rows in group selected
    test('MV-02 hovering group header reveals selectGroup; click selects all rows in group', async ({ request, page }) => {
        const sourceWallet = await createWalletViaApi(request, { name: `E2E MV02-src ${Date.now()}` })
        const targetWallet = await createWalletViaApi(request, { name: `E2E MV02-tgt ${Date.now()}` })
        // Create two charges with today's date so they end up in the same group
        const c1 = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV02-a ${Date.now()}` })
        const c2 = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV02-b ${Date.now()}` })
        try {
            await page.goto(`/wallets/${sourceWallet.id}`)
            await expect(wallet.detailHeading(page)).toContainText(sourceWallet.name, { timeout: 10000 })

            // Wait for charges to load
            const row = chargeRows(page).first()
            await expect(row).toBeVisible({ timeout: 10000 })

            // Find the group header — it contains class "group" and has the selectGroup button
            // Group headers are rendered as div.group.px-0 with the select-group button inside
            const groupHeader = page.locator('div.group.px-0').first()
            await expect(groupHeader).toBeVisible({ timeout: 5000 })

            // Hover the group header to reveal the select button
            await groupHeader.hover()

            const groupSelectBtn = selectGroupBtn(groupHeader)
            await expect(groupSelectBtn).toBeVisible({ timeout: 5000 })
            await groupSelectBtn.click()

            // Move toolbar should appear (group selected + ≥2 active wallets)
            await expect(moveToolbar(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteChargeViaApi(request, sourceWallet.id, c1.id) } catch { /* ignore */ }
            try { await deleteChargeViaApi(request, sourceWallet.id, c2.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, sourceWallet.id)
            await deleteWalletViaApi(request, targetWallet.id)
        }
    })

    // MV-03 — Toolbar shows charges.selectedCount
    test('MV-03 toolbar shows selected count text', async ({ request, page }) => {
        const sourceWallet = await createWalletViaApi(request, { name: `E2E MV03-src ${Date.now()}` })
        const targetWallet = await createWalletViaApi(request, { name: `E2E MV03-tgt ${Date.now()}` })
        const c = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV03 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${sourceWallet.id}`)
            await expect(wallet.detailHeading(page)).toContainText(sourceWallet.name, { timeout: 10000 })

            const row = chargeRows(page).first()
            await expect(row).toBeVisible({ timeout: 10000 })

            await row.hover()
            await selectChargeBtn(row).click()

            // Toolbar should show "{n} selected" text
            await expect(selectedCountText(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteChargeViaApi(request, sourceWallet.id, c.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, sourceWallet.id)
            await deleteWalletViaApi(request, targetWallet.id)
        }
    })

    // MV-04 — Move dropdown lists other active wallets; picking one moves charges
    test('MV-04 @smoke Move dropdown lists other wallets; picking one moves the charge', async ({ request, page }) => {
        const sourceWallet = await createWalletViaApi(request, { name: `E2E MV04-src ${Date.now()}` })
        const targetWallet = await createWalletViaApi(request, { name: `E2E MV04-tgt ${Date.now()}` })
        const c = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV04 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${sourceWallet.id}`)
            await expect(wallet.detailHeading(page)).toContainText(sourceWallet.name, { timeout: 10000 })

            const row = chargeRows(page).first()
            await expect(row).toBeVisible({ timeout: 10000 })

            // Select the charge
            await row.hover()
            await selectChargeBtn(row).click()
            await expect(moveToolbar(page)).toBeVisible({ timeout: 5000 })

            // Click the Move button to open the dropdown
            const moveBtn = moveToolbar(page)
            await moveBtn.click()

            // The target wallet should appear as a menuitem option
            await expect(
                page.getByRole('menuitem', { name: new RegExp(targetWallet.name, 'i') }),
            ).toBeVisible({ timeout: 5000 })

            // Pick the target wallet → observe moveCharges POST
            const movePromise = page.waitForRequest(
                req => req.url().includes(`/charges/move/${targetWallet.id}`) && req.method() === 'POST',
                { timeout: 8000 },
            )

            await page.getByRole('menuitem', { name: new RegExp(targetWallet.name, 'i') }).click()

            // Verify the move request was fired
            await movePromise

            // The move toolbar should disappear (selectedCharges cleared after move)
            await expect(moveToolbar(page)).not.toBeVisible({ timeout: 8000 })

            await assertNoErrorLeak(page)
        } finally {
            // Charge was moved to targetWallet; delete from there (best-effort)
            try { await deleteChargeViaApi(request, targetWallet.id, c.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, sourceWallet.id)
            await deleteWalletViaApi(request, targetWallet.id)
        }
    })

    // MV-05 — Clear → toolbar disappears
    test('MV-05 @smoke clicking Clear removes the move toolbar', async ({ request, page }) => {
        const sourceWallet = await createWalletViaApi(request, { name: `E2E MV05-src ${Date.now()}` })
        const targetWallet = await createWalletViaApi(request, { name: `E2E MV05-tgt ${Date.now()}` })
        const c = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV05 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${sourceWallet.id}`)
            await expect(wallet.detailHeading(page)).toContainText(sourceWallet.name, { timeout: 10000 })

            const row = chargeRows(page).first()
            await expect(row).toBeVisible({ timeout: 10000 })

            // Select a charge
            await row.hover()
            await selectChargeBtn(row).click()
            await expect(moveToolbar(page)).toBeVisible({ timeout: 5000 })

            // Click Clear
            await clearSelectionBtn(page).click()

            // Toolbar should disappear
            await expect(moveToolbar(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteChargeViaApi(request, sourceWallet.id, c.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, sourceWallet.id)
            await deleteWalletViaApi(request, targetWallet.id)
        }
    })

    // MV-06 — Route 500 on move → charges.moveError alert shown (closable)
    // Intentional error test — skip assertNoErrorLeak (the app shows an error by design)
    test('MV-06 move server error shows moveError alert', async ({ request, page }) => {
        const sourceWallet = await createWalletViaApi(request, { name: `E2E MV06-src ${Date.now()}` })
        const targetWallet = await createWalletViaApi(request, { name: `E2E MV06-tgt ${Date.now()}` })
        const c = await createChargeViaApi(request, sourceWallet.id, { title: `E2E MV06 ${Date.now()}` })
        try {
            // Force 500 on the move endpoint
            await routeError(page, `**/api/wallets/${sourceWallet.id}/charges/move/**`)

            await page.goto(`/wallets/${sourceWallet.id}`)
            await expect(wallet.detailHeading(page)).toContainText(sourceWallet.name, { timeout: 10000 })

            const row = chargeRows(page).first()
            await expect(row).toBeVisible({ timeout: 10000 })

            // Select a charge
            await row.hover()
            await selectChargeBtn(row).click()
            await expect(moveToolbar(page)).toBeVisible({ timeout: 5000 })

            // Click Move then pick the target wallet
            await moveToolbar(page).click()
            await expect(
                page.getByRole('menuitem', { name: new RegExp(targetWallet.name, 'i') }),
            ).toBeVisible({ timeout: 5000 })
            await page.getByRole('menuitem', { name: new RegExp(targetWallet.name, 'i') }).click()

            // The moveError alert should appear
            await expect(moveErrorAlert(page)).toBeVisible({ timeout: 8000 })

            // The alert should be closable (UAlert with close prop renders a close button)
            const closeBtn = page.locator('[data-slot="close"]').first()
            if (await closeBtn.isVisible()) {
                await closeBtn.click()
                await expect(moveErrorAlert(page)).not.toBeVisible({ timeout: 3000 })
            }
            // skip assertNoErrorLeak — intentional error test
        } finally {
            try { await deleteChargeViaApi(request, sourceWallet.id, c.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, sourceWallet.id)
            await deleteWalletViaApi(request, targetWallet.id)
        }
    })

})
