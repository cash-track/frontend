// S12 — Charge row actions: edit + delete (ChargeItem, ChargeEdit, ConfirmModal)
// CE-01..CE-08
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeJson,
    createWalletViaApi, createChargeViaApi, deleteWalletViaApi,
    charge, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────

// The inline ChargeEdit form (identified by its update button inside a form)
const editForm = (page: import('@playwright/test').Page) =>
    page.locator('form').filter({
        has: page.getByRole('button', { name: label('charges.update') }),
    }).first()

// Update button in the edit form
const updateButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.update') })

// Cancel button in the edit/create form
const cancelButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.cancel') })

// ConfirmModal delete button: ChargeItem uses confirmLabel=t('charges.delete') and
// cancelLabel=t('charges.cancel'). So the confirm button label is 'charges.delete'.
const deleteConfirmBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByRole('button', {
        name: new RegExp(labelStrings('charges.delete').join('|'), 'i'),
    }).last() // last because dialog has cancel + confirm

// ConfirmModal cancel button: ChargeItem uses cancelLabel=t('charges.cancel')
const deleteModalCancelBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByRole('button', {
        name: new RegExp(labelStrings('charges.cancel').join('|'), 'i'),
    })

// Delete error inside modal (UAlert description slot)
const deleteModalError = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').locator('[data-slot="description"]').filter({
        hasText: new RegExp(labelStrings('charges.deleteError').join('|'), 'i'),
    })

// Minimal mock profile (email confirmed = true by default)
function mockProfile(isEmailConfirmed = true) {
    const now = new Date().toISOString()
    return {
        id: 1,
        name: 'E2E Test',
        lastName: null,
        nickName: 'e2etest',
        email: 'e2e@test.com',
        isEmailConfirmed,
        photoUrl: null,
        defaultCurrencyCode: 'USD',
        defaultCurrency: {
            id: 'USD',
            code: 'USD',
            name: 'United States dollar',
            char: '$',
            rate: 1,
            updatedAt: now,
        },
        locale: 'en',
        createdAt: now,
        updatedAt: now,
    }
}

// Find a charge row by its title text
function chargeRow(page: import('@playwright/test').Page, title: string) {
    return page.locator('.group').filter({ hasText: title }).first()
}

test.describe('S12 — Charge Edit + Delete', () => {

    // CE-01 — hover row → actions visible → open dropdown → Edit/Delete items @smoke
    test('CE-01 @smoke hover row reveals actions menu with Edit and Delete', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE01 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE01 Charge ${Date.now()}`,
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()

            // Actions button becomes visible on hover
            const actionsBtn = charge.rowActions(row)
            await expect(actionsBtn).toBeVisible({ timeout: 5000 })

            await actionsBtn.click()

            // Dropdown items should appear
            await expect(
                page.getByRole('menuitem', { name: new RegExp(labelStrings('charges.edit').join('|'), 'i') }),
            ).toBeVisible({ timeout: 5000 })
            await expect(
                page.getByRole('menuitem', { name: new RegExp(labelStrings('charges.delete').join('|'), 'i') }),
            ).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-02 — Edit → ChargeEdit form; change amount/title → Update → row reflects change
    test('CE-02 @smoke inline edit changes are reflected in row', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE02 ${Date.now()}` })
        try {
            const originalTitle = `E2E CE02 ${Date.now()}`
            const updatedTitle = `E2E CE02 Updated ${Date.now()}`
            await createChargeViaApi(request, w.id, {
                title: originalTitle,
                amount: 15,
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, originalTitle)
            await row.hover()
            await charge.rowActions(row).click()

            // Click Edit
            await page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.edit').join('|'), 'i'),
            }).click()

            // ChargeEdit form should appear in the row
            await expect(editForm(page)).toBeVisible({ timeout: 5000 })

            // Change the title
            const titleField = editForm(page).getByPlaceholder(label('charges.title'))
            await titleField.fill(updatedTitle)

            // Change amount
            const amountField = editForm(page).getByRole('spinbutton').first()
            await amountField.fill('99')

            // Submit update
            await updateButton(page).click()

            // Updated title should now appear in the list
            await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 })

            // Edit form should close
            await expect(editForm(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-03 — Edit cancel → back to read view
    test('CE-03 edit Cancel returns to read view', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE03 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE03 ${Date.now()}`,
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()
            await charge.rowActions(row).click()

            await page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.edit').join('|'), 'i'),
            }).click()

            await expect(editForm(page)).toBeVisible({ timeout: 5000 })

            // Click Cancel
            await cancelButton(page).click()

            // Edit form should close
            await expect(editForm(page)).not.toBeVisible({ timeout: 5000 })

            // Original charge title still visible
            await expect(page.getByText(c.title)).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-04 — Route 422 / 500 on update → errors in edit form
    // Intentional error test — skip assertNoErrorLeak
    test('CE-04 route422/500 on update shows errors in edit form', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE04 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE04 ${Date.now()}`,
            })

            // Block PUT requests with 422
            await page.route(`**/api/wallets/${w.id}/charges/${c.id}`, route => {
                if (route.request().method() === 'PUT') {
                    return route.fulfill({
                        status: 422,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            errors: { title: ['Title is too short'] },
                        }),
                    })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()
            await charge.rowActions(row).click()

            await page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.edit').join('|'), 'i'),
            }).click()

            await expect(editForm(page)).toBeVisible({ timeout: 5000 })

            // Submit without changes to trigger 422
            await updateButton(page).click()

            // Field error should appear
            await expect(page.getByText('Title is too short').first()).toBeVisible({ timeout: 5000 })
            // intentional error test — no assertNoErrorLeak
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-05 — Delete → ConfirmModal with correct labels; Cancel closes
    test('CE-05 @smoke Delete opens ConfirmModal; Cancel closes', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE05 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE05 ${Date.now()}`,
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()
            await charge.rowActions(row).click()

            await page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.delete').join('|'), 'i'),
            }).click()

            // ConfirmModal (UModal) should open
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

            // Modal contains charges.deletingConfirm text (with charge title)
            await expect(page.getByRole('dialog')).toContainText(c.title, { timeout: 3000 })

            // Cancel button uses charges.cancel label (not common.cancel)
            await expect(deleteModalCancelBtn(page)).toBeVisible()
            await deleteModalCancelBtn(page).click()

            // Dialog should close
            await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-06 — Confirm delete → row removed, no dialog
    test('CE-06 @smoke confirm delete removes row', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE06 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE06 ${Date.now()}`,
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()
            await charge.rowActions(row).click()

            await page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.delete').join('|'), 'i'),
            }).click()

            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

            // Confirm deletion
            await deleteConfirmBtn(page).click()

            // Dialog should close
            await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

            // Row should be removed from the list
            await expect(page.getByText(c.title)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            // Wallet cleanup only — charge was deleted by the test
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-07 — Delete error: deleteError shown in modal; confirm loading then released
    // Intentional error test — skip assertNoErrorLeak
    test('CE-07 route500 on delete shows deleteError in modal', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE07 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE07 ${Date.now()}`,
            })

            // Block DELETE with 500
            await page.route(`**/api/wallets/${w.id}/charges/${c.id}`, route => {
                if (route.request().method() === 'DELETE') {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"E2E forced delete error"}',
                    })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()
            await charge.rowActions(row).click()

            await page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.delete').join('|'), 'i'),
            }).click()

            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

            // Click confirm — will get a 500
            await deleteConfirmBtn(page).click()

            // Error should appear inside the modal
            await expect(deleteModalError(page)).toBeVisible({ timeout: 5000 })

            // Modal stays open (row not removed)
            await expect(page.getByRole('dialog')).toBeVisible()

            // intentional error test — no assertNoErrorLeak
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CE-08 — Email-not-confirmed: Edit/Delete items disabled; info label present
    test('CE-08 email-not-confirmed: Edit/Delete disabled in dropdown', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CE08 ${Date.now()}` })
        try {
            const c = await createChargeViaApi(request, w.id, {
                title: `E2E CE08 ${Date.now()}`,
            })

            // Mock profile returning isEmailConfirmed=false
            await routeJson(page, '**/api/profile', mockProfile(false))

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            const row = chargeRow(page, c.title)
            await row.hover()
            await charge.rowActions(row).click()

            // emailConfirmRequired info label should appear (type:'label' renders as [data-slot="label"])
            await expect(
                page.locator('[data-slot="label"]').filter({
                    hasText: new RegExp(labelStrings('emailConfirmRequired').join('|'), 'i'),
                }),
            ).toBeVisible({ timeout: 5000 })

            // Edit and Delete items should be aria-disabled
            const editItem = page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.edit').join('|'), 'i'),
            })
            const deleteItem = page.getByRole('menuitem', {
                name: new RegExp(labelStrings('charges.delete').join('|'), 'i'),
            })
            await expect(editItem).toHaveAttribute('aria-disabled', 'true')
            await expect(deleteItem).toHaveAttribute('aria-disabled', 'true')

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

})
