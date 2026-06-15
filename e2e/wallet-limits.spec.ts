// S19 — Wallet Limits (/wallets/:id — Limits collapsible section)
// Components: WalletLimitsTotal, LimitForm, WalletLimitItem
//
// KEY FACT: The API requires tags to be a non-empty array when creating/updating limits.
// LM-02 therefore seeds a tag and selects it via the TagFormInput before submitting.
// LM-03..LM-05 seed limits via API directly so they don't depend on the UI create path.
import { test, expect } from '@playwright/test'
import {
    label,
    createWalletViaApi, deleteWalletViaApi,
    createTagViaApi, deleteTagViaApi,
    createLimitViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors ───────────────────────────────────────────────────────────

// Spinner inside WalletLimitsTotal (animate-spin inside the limits collapsible)
const limitsSpinner = (page: import('@playwright/test').Page) =>
    // The limits panel (collapsible) is the 3rd [data-slot="content"] on wallet detail.
    // The spinner is a .animate-spin INSIDE the visible limits panel.
    page.locator('[data-slot="content"]:visible .animate-spin').first()

// "Create Limit" button (limits.createLimit)
const createLimitBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('limits.createLimit') })

// "Copy From" button (limits.copyFrom)
const copyFromBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('limits.copyFrom') })

// Amount input in the VISIBLE LimitForm (the limits panel, not charge create)
const limitAmountInput = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="content"]:visible input[type="number"]').first()

// Submit button in LimitForm (limits.create)
const limitFormCreate = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="content"]:visible').getByRole('button', { name: label('limits.create') }).first()

// Submit for edit form (limits.update)
const limitFormUpdate = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="content"]:visible').getByRole('button', { name: label('limits.update') }).first()

// Row actions button inside limits panel (t('actions'))
const limitRowActions = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="content"]:visible')
        .getByRole('button', { name: /Actions|Дії/i })
        .first()

// Confirm dialog cancel (limits.cancel — NOT common.cancel)
const limitConfirmCancel = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByRole('button', { name: label('limits.cancel') })

// Confirm dialog confirm (limits.delete)
const limitConfirmDelete = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByRole('button', { name: label('limits.delete') })

// Total row (limits.total)
const limitsTotalRow = (page: import('@playwright/test').Page) =>
    page.getByText(label('limits.total'))

// Progress bar track in a limit item
const progressBar = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="content"]:visible .bg-gray-200').first()

// Helper: open wallet detail and expand the Limits panel.
//
// WalletLimitsTotal has :unmount-on-hide="false" — it mounts on page load and
// fires GET /limits immediately (before the user opens the panel). We register
// waitForResponse BEFORE page.goto so we don't miss the early response.
async function openLimitsPanel(page: import('@playwright/test').Page, walletId: number) {
    // Register BEFORE navigation so we don't miss the early GET /limits response
    const limitsResponse = page.waitForResponse(
        res => res.url().includes(`/wallets/${walletId}/limits`) && res.status() < 500,
        { timeout: 15000 },
    )
    await page.goto(`/wallets/${walletId}`)
    await expect(wallet.detailHeading(page)).toBeVisible({ timeout: 10000 })
    // Confirm the limits data loaded (even though panel is hidden)
    await limitsResponse
    // Open the panel (component already has data)
    await wallet.toolLimits(page).click()
    // Create Limit button should be visible once panel opens
    // (it always shows when !showCreateForm, regardless of limits state)
    await expect(createLimitBtn(page)).toBeVisible({ timeout: 5000 })
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('S19 — Wallet Limits', () => {

    // LM-01 — Open limits: spinner visible then Create button
    // WalletLimitsTotal has :unmount-on-hide="false" — it loads at page mount.
    // We hold the GET /limits response BEFORE page.goto so the spinner appears
    // immediately when we open the collapsible.
    test('LM-01 @smoke open limits shows spinner then Create button', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E LM01 ${Date.now()}` })
        try {
            // Hold the limits request BEFORE navigation
            let release!: () => void
            const gate = new Promise<void>(res => { release = res })
            await page.route(`**/api/wallets/${w.id}/limits`, async route => {
                if (route.request().method() === 'GET') {
                    await gate
                }
                await route.continue()
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toBeVisible({ timeout: 10000 })

            // Open the limits panel while data is still loading
            await wallet.toolLimits(page).click()

            // Spinner should be visible in the now-open panel
            // (loading=true because GET /limits is still held)
            await expect(limitsSpinner(page)).toBeVisible({ timeout: 5000 })

            // Release the held request
            release()

            // Spinner goes away; Create Limit button appears
            await expect(limitsSpinner(page)).not.toBeVisible({ timeout: 5000 })
            await expect(createLimitBtn(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // LM-02 — Create limit via UI: need to select a tag (API requires tags)
    test('LM-02 @smoke create limit via form with tag', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E LM02 ${Date.now()}` })
        const t = await createTagViaApi(request, { name: `E2Elm02${Date.now()}` })
        try {
            await openLimitsPanel(page, w.id)

            // Click Create Limit
            await createLimitBtn(page).click()

            // LimitForm appears — amount input visible
            await expect(limitAmountInput(page)).toBeVisible({ timeout: 5000 })

            // Must select a tag first (API requires non-empty tags array).
            // TagFormInput is a custom input — typing triggers a search, results show
            // as TagChip buttons in a custom dropdown div (not a combobox/listbox).
            const tagInput = page.locator('[data-slot="content"]:visible input[placeholder]').first()
            await tagInput.click()
            await tagInput.fill(t.name.substring(0, 6))
            // Wait for the custom dropdown to appear
            // TagFormInput uses @blur with 200ms delay; use mousedown to select
            const tagChipInDropdown = page.locator('[data-slot="content"]:visible')
                .locator('.absolute.z-10 button[class*="rounded-full"]')
                .filter({ hasText: t.name.substring(0, 6) })
                .first()
            await expect(tagChipInDropdown).toBeVisible({ timeout: 5000 })
            await tagChipInDropdown.click()

            // Fill amount
            await limitAmountInput(page).fill('500')

            // Submit — wait for API response
            const [res] = await Promise.all([
                page.waitForResponse(
                    r => r.url().includes(`/wallets/${w.id}/limits`) && r.request().method() === 'POST',
                    { timeout: 15000 },
                ),
                limitFormCreate(page).click(),
            ])
            expect(res.status()).toBe(200)

            // Form closes; Create Limit button returns
            await expect(createLimitBtn(page)).toBeVisible({ timeout: 5000 })

            // A progress bar (limit item) should appear
            await expect(progressBar(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
            await deleteTagViaApi(request, t.id)
        }
    })

    // LM-03 — Edit limit: seed via API, then edit via UI
    test('LM-03 @smoke edit limit updates amount', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E LM03 ${Date.now()}` })
        const t = await createTagViaApi(request, { name: `E2Elm03${Date.now()}` })
        try {
            // Seed a limit via API
            await createLimitViaApi(request, w.id, t.id, { amount: 200 })

            await openLimitsPanel(page, w.id)

            // Progress bar should be visible (limit item rendered)
            await expect(progressBar(page)).toBeVisible({ timeout: 5000 })

            // Open row actions dropdown → Edit
            await limitRowActions(page).click()
            await page.getByRole('menuitem', { name: label('limits.edit') }).click()

            // Edit form appears — amount input visible
            await expect(limitAmountInput(page)).toBeVisible({ timeout: 5000 })

            // Update amount
            await limitAmountInput(page).fill('999')

            // Submit update — wait for PUT response
            const [putRes] = await Promise.all([
                page.waitForResponse(
                    r => r.url().includes('/limits/') && r.request().method() === 'PUT',
                    { timeout: 15000 },
                ),
                limitFormUpdate(page).click(),
            ])
            expect(putRes.status()).toBe(200)

            // Edit form closes
            await expect(limitFormUpdate(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
            await deleteTagViaApi(request, t.id)
        }
    })

    // LM-04 — Delete limit: ConfirmModal with limits.cancel → confirm → removed
    test('LM-04 @smoke delete limit via ConfirmModal', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E LM04 ${Date.now()}` })
        const t = await createTagViaApi(request, { name: `E2Elm04${Date.now()}` })
        try {
            // Seed a limit via API
            await createLimitViaApi(request, w.id, t.id, { amount: 100 })

            await openLimitsPanel(page, w.id)
            await expect(progressBar(page)).toBeVisible({ timeout: 5000 })

            // Open row actions → Delete
            await limitRowActions(page).click()
            await page.getByRole('menuitem', { name: label('limits.delete') }).click()

            // ConfirmModal appears — dialog visible with title "limits.delete"
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
            // Verify dialog title (limits.delete) is shown — the title is passed as :title to UModal
            await expect(
                page.getByRole('dialog').getByText(label('limits.delete')).first()
            ).toBeVisible({ timeout: 3000 })

            // Cancel button uses limits.cancel (NOT common.cancel — per WalletLimitItem :cancel-label)
            await expect(limitConfirmCancel(page)).toBeVisible()

            // Confirm deletion — wait for DELETE response
            const [delRes] = await Promise.all([
                page.waitForResponse(
                    r => r.url().includes('/limits/') && r.request().method() === 'DELETE',
                    { timeout: 10000 },
                ),
                limitConfirmDelete(page).click(),
            ])
            expect(delRes.status()).toBe(200)

            // Dialog closes
            await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

            // Progress bar (limit item) gone
            await expect(progressBar(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
            await deleteTagViaApi(request, t.id)
        }
    })

    // LM-05 — Totals row: with expense limit the limits.total row is visible
    test('LM-05 @smoke totals row visible with expense limit', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E LM05 ${Date.now()}` })
        const t = await createTagViaApi(request, { name: `E2Elm05${Date.now()}` })
        try {
            // Seed an expense limit
            await createLimitViaApi(request, w.id, t.id, { type: '-', amount: 1000 })

            await openLimitsPanel(page, w.id)

            // Total row should be visible (hasExpenseTotals = totalExpenseLimitAmount > 0)
            await expect(limitsTotalRow(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
            await deleteTagViaApi(request, t.id)
        }
    })

    // LM-06 — Copy-from: seed source wallet with a limit; dest wallet with none → copy
    test('LM-06 copy-from another wallet copies limits', async ({ request, page }) => {
        const source = await createWalletViaApi(request, { name: `E2E LM06-src ${Date.now()}` })
        const dest = await createWalletViaApi(request, { name: `E2E LM06-dst ${Date.now()}` })
        const t = await createTagViaApi(request, { name: `E2Elm06${Date.now()}` })
        try {
            // Seed a limit on the source wallet via API
            await createLimitViaApi(request, source.id, t.id, { amount: 300 })

            // Open dest wallet (no limits) → limits panel
            await openLimitsPanel(page, dest.id)

            // Copy From button should appear (no limits on dest, source has some)
            await expect(copyFromBtn(page)).toBeVisible({ timeout: 10000 })

            // Click Copy From → dropdown with source wallet name
            await copyFromBtn(page).click()
            await expect(
                page.getByRole('menuitem', { name: source.name }).first(),
            ).toBeVisible({ timeout: 5000 })

            // Select source wallet — wait for copy API response
            const [copyRes] = await Promise.all([
                page.waitForResponse(
                    r => r.url().includes('/limits/copy/') && r.request().method() === 'POST',
                    { timeout: 15000 },
                ),
                page.getByRole('menuitem', { name: source.name }).first().click(),
            ])
            expect(copyRes.status()).toBe(200)

            // After copy: progress bar appears, Copy From disappears
            await expect(progressBar(page)).toBeVisible({ timeout: 5000 })
            await expect(copyFromBtn(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, source.id)
            await deleteWalletViaApi(request, dest.id)
            await deleteTagViaApi(request, t.id)
        }
    })

})
