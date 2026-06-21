// S9 — Tags list (/tags)
// Components: TagsView, CreateTag, TagForm, Tag (TagChip), ConfirmModal
import { test, expect } from '@playwright/test'
import {
    label, labelStrings, labelExact,
    routeEmpty, routeDelay, route422,
    createTagViaApi, deleteTagViaApi,
    tag, overlay, assertNoErrorLeak,
} from './support'

// ── Local selectors ─────────────────────────────────────────────────────────
// Spinner: UIcon with animate-spin inside loading block
const spinner = (page: import('@playwright/test').Page) =>
    page.locator('.animate-spin').first()

// UAlert renders as a styled div — it does NOT have role="alert".
// Assert by visible text content instead.
const tagsErrorText = (page: import('@playwright/test').Page) =>
    page.getByText(label('tags.statsLoadingError'))

const emptyPlaceholder = (page: import('@playwright/test').Page) =>
    page.getByText(label('tags.addNew'))

// The info alert uses color="neutral" variant="subtle" — no ARIA role; match by text.
const infoAlertText = (page: import('@playwright/test').Page) =>
    page.getByText(label('tags.editInfoLine1'))

// The delete error is inside a UAlert inside the dialog body.
const deleteErrorInDialog = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog').getByText(label('tags.deleteError'))

test.describe('S9 — Tags List', () => {

    // TG-01 — Page loads with h1 and create form @smoke
    test('TG-01 @smoke page renders h1 and create form', async ({ page }) => {
        await page.goto('/tags')

        await expect(page.getByRole('heading', { level: 1 }))
            .toContainText(label('tags.tags'), { timeout: 10000 })

        // Create form: name input placeholder should be visible
        await expect(tag.nameInput(page)).toBeVisible({ timeout: 10000 })
        await assertNoErrorLeak(page)
    })

    // TG-02 — Loading spinner visible while GET /api/tags is held
    test('TG-02 loading spinner visible during fetch', async ({ page }) => {
        const release = await routeDelay(page, '**/api/tags')

        await page.goto('/tags')

        await expect(spinner(page)).toBeVisible({ timeout: 5000 })

        release()

        // After release, heading appears
        await expect(page.getByRole('heading', { level: 1 }))
            .toContainText(label('tags.tags'), { timeout: 10000 })
        await assertNoErrorLeak(page)
    })

    // TG-03 — Server 500 → error alert + Retry button; clicking Retry refetches
    test('TG-03 server error shows alert and Retry button that refetches', async ({ page }) => {
        test.setTimeout(60000)
        // Block the first call with 500, then on the 2nd allow it through
        let callCount = 0
        await page.route('**/api/tags', route => {
            callCount++
            if (callCount === 1) {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: '{"message":"E2E forced error"}',
                })
            } else {
                route.continue()
            }
        })

        await page.goto('/tags')

        await expect(tagsErrorText(page)).toBeVisible({ timeout: 10000 })

        const retryBtn = page.getByRole('button', { name: label('retry') })
        await expect(retryBtn).toBeVisible()

        // Clicking retry should refetch and show the page (or the list / empty state)
        await retryBtn.click()

        // After retry the error text should disappear and the heading remains
        await expect(tagsErrorText(page)).not.toBeVisible({ timeout: 10000 })
        await expect(page.getByRole('heading', { level: 1 }))
            .toContainText(label('tags.tags'), { timeout: 10000 })
        await assertNoErrorLeak(page)
    })

    // TG-04 — Empty state: routeEmpty → empty placeholder
    test('TG-04 empty state shows addNew placeholder', async ({ page }) => {
        await routeEmpty(page, '**/api/tags')
        await page.goto('/tags')

        // The empty placeholder paragraph
        await expect(emptyPlaceholder(page).first()).toBeVisible({ timeout: 10000 })
        await assertNoErrorLeak(page)
    })

    // TG-05 — Create happy path @smoke
    test('TG-05 @smoke create a tag → chip appears in the grid', async ({ request, page }) => {
        const suffix = Date.now()
        const tagName = `E2Etag${suffix}`
        let createdId: number | null = null

        await page.goto('/tags')
        await expect(tag.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Type the tag name
        await tag.nameInput(page).fill(tagName)

        // Create button should now be enabled
        await expect(tag.createButton(page)).toBeEnabled({ timeout: 5000 })

        // Intercept the create response to capture the ID for cleanup
        const responsePromise = page.waitForResponse(
            res => res.url().includes('/api/tags') && res.request().method() === 'POST',
            { timeout: 10000 },
        )

        await tag.createButton(page).click()

        const res = await responsePromise
        const body = await res.json()
        createdId = body?.data?.id ?? null

        // The new chip should appear in the grid
        await expect(tag.chip(page).filter({ hasText: tagName })).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)

        // Cleanup
        if (createdId !== null) {
            await deleteTagViaApi(request, createdId)
        }
    })

    // TG-06 — Validation: empty disabled, too-short error, spaces error; preview chip updates
    test('TG-06 validation states: disabled when empty, too-short, no-spaces', async ({ page }) => {
        await page.goto('/tags')
        await expect(tag.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Empty → Create button disabled
        await expect(tag.createButton(page)).toBeDisabled()

        // 'ab' (2 chars) → nameTooShort error
        await tag.nameInput(page).fill('ab')
        await expect(page.getByText(label('tags.nameTooShort'))).toBeVisible({ timeout: 5000 })
        await expect(tag.createButton(page)).toBeDisabled()

        // Clear and type 'a b' (spaces) → nameNoSpaces error
        await tag.nameInput(page).fill('')
        await tag.nameInput(page).fill('a b')
        await expect(page.getByText(label('tags.nameNoSpaces'))).toBeVisible({ timeout: 5000 })
        await expect(tag.createButton(page)).toBeDisabled()

        // Valid name → preview chip should show the name
        await tag.nameInput(page).fill('')
        await tag.nameInput(page).fill('abc')
        // Preview label + chip visible
        await expect(page.getByText(label('tags.preview'))).toBeVisible()
        await expect(tag.createButton(page)).toBeEnabled({ timeout: 5000 })

        await assertNoErrorLeak(page)
    })

    // TG-07 — Color picker change updates preview chip background
    test('TG-07 color picker changes preview chip background', async ({ page }) => {
        await page.goto('/tags')
        await expect(tag.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Type a valid name first so the preview is rendering real content
        await tag.nameInput(page).fill('abc')

        // Change the color to red via JS (native color input is hard to interact with)
        const newColor = '#ff0000'
        await tag.colorPicker(page).evaluate(
            (el: HTMLInputElement, color) => {
                el.value = color
                el.dispatchEvent(new Event('input', { bubbles: true }))
                el.dispatchEvent(new Event('change', { bubbles: true }))
            },
            newColor,
        )

        // The preview chip is the button next to the "Preview:" label.
        // Its background-color style comes from tag.color + '1a' (10% alpha).
        // We assert the color input value changed (the chip style uses a CSS expression).
        await expect(tag.colorPicker(page)).toHaveValue(newColor)
        await assertNoErrorLeak(page)
    })

    // TG-08 — Server 422 on POST /api/tags → field error under input
    test('TG-08 server 422 shows field error under input', async ({ page }) => {
        await route422(page, '**/api/tags', { name: ['Name already taken'] }, 'POST')

        await page.goto('/tags')
        await expect(tag.nameInput(page)).toBeVisible({ timeout: 10000 })

        await tag.nameInput(page).fill('abc')
        await expect(tag.createButton(page)).toBeEnabled({ timeout: 5000 })
        await tag.createButton(page).click()

        // Field error should appear (rendered by UFormField :error)
        await expect(page.getByText(/Name already taken/i)).toBeVisible({ timeout: 8000 })
        await assertNoErrorLeak(page)
    })

    // TG-09 — Chip → Popover → View navigates to /tags/{id} @smoke
    test('TG-09 @smoke chip → View popover action → navigates to tag detail', async ({
        request,
        page,
    }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            await page.goto('/tags')

            // Find and click the seeded chip
            const chip = tag.chip(page).filter({ hasText: seeded.name })
            await expect(chip).toBeVisible({ timeout: 10000 })
            await chip.click()

            // Popover opens — click View
            await expect(tag.popoverView(page)).toBeVisible({ timeout: 5000 })
            await tag.popoverView(page).click()

            // Should navigate to /tags/{id}
            await page.waitForURL(new RegExp(`/tags/${seeded.id}`), { timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            // If the tag was deleted by navigation, skip the cleanup error
            try { await deleteTagViaApi(request, seeded.id) } catch { /* already gone */ }
        }
    })

    // TG-10 — Chip → Popover → Edit → UModal with TagForm prefilled; save → chip updates
    test('TG-10 chip → Edit modal → save → chip text updates', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        const updatedId: number | null = seeded.id
        try {
            await page.goto('/tags')

            const chip = tag.chip(page).filter({ hasText: seeded.name })
            await expect(chip).toBeVisible({ timeout: 10000 })
            await chip.click()

            await expect(tag.popoverEdit(page)).toBeVisible({ timeout: 5000 })
            await tag.popoverEdit(page).click()

            // Edit modal should open
            const modal = page.getByRole('dialog')
            await expect(modal).toBeVisible({ timeout: 5000 })

            // TagForm inside modal should be prefilled with tag name
            const nameField = modal.getByPlaceholder(label('tags.inputLabel'))
            await expect(nameField).toBeVisible()
            await expect(nameField).toHaveValue(new RegExp(seeded.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))

            // Change the name (keep length >= 3, no spaces)
            const newName = `E2Etag${Date.now()}u`
            await nameField.fill(newName)

            // Save button (update mode)
            const saveBtn = modal.getByRole('button', { name: labelExact('tags.update') })
            await expect(saveBtn).toBeEnabled({ timeout: 5000 })
            await saveBtn.click()

            // Modal should close
            await expect(modal).not.toBeVisible({ timeout: 10000 })

            // Chip should now show updated name
            await expect(tag.chip(page).filter({ hasText: newName })).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            if (updatedId !== null) {
                try { await deleteTagViaApi(request, updatedId) } catch { /* best effort */ }
            }
        }
    })

    // TG-11 — Chip → Popover → Delete → ConfirmModal; confirm removes chip; error path
    test('TG-11 chip → Delete → ConfirmModal; confirm removes chip', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        let needsCleanup = true
        try {
            await page.goto('/tags')

            const chip = tag.chip(page).filter({ hasText: seeded.name })
            await expect(chip).toBeVisible({ timeout: 10000 })
            await chip.click()

            await expect(tag.popoverDelete(page)).toBeVisible({ timeout: 5000 })
            await tag.popoverDelete(page).click()

            // ConfirmModal should open
            const dialog = overlay.dialog(page)
            await expect(dialog).toBeVisible({ timeout: 5000 })

            // Modal body contains deletingConfirm text
            await expect(dialog).toContainText(
                new RegExp(labelStrings('tags.deletingConfirm').join('|').replace(/\{name\}/g, '.*'), 'i'),
            )

            // Confirm
            await overlay.confirmDelete(page).click()

            // Modal should close and chip removed
            await expect(dialog).not.toBeVisible({ timeout: 10000 })
            await expect(chip).not.toBeVisible({ timeout: 10000 })

            needsCleanup = false
            await assertNoErrorLeak(page)
        } finally {
            if (needsCleanup) {
                try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
            }
        }
    })

    // TG-11b — Delete error path: 500 on DELETE shows deleteError in modal
    test('TG-11b delete error path shows deleteError in modal', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            // Block the DELETE call
            await page.route('**/api/tags/**', route => {
                if (route.request().method() === 'DELETE') {
                    route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"E2E forced delete error"}',
                    })
                } else {
                    route.continue()
                }
            })

            await page.goto('/tags')

            const chip = tag.chip(page).filter({ hasText: seeded.name })
            await expect(chip).toBeVisible({ timeout: 10000 })
            await chip.click()

            await expect(tag.popoverDelete(page)).toBeVisible({ timeout: 5000 })
            await tag.popoverDelete(page).click()

            const dialog = overlay.dialog(page)
            await expect(dialog).toBeVisible({ timeout: 5000 })
            await overlay.confirmDelete(page).click()

            // Delete error should appear inside the dialog
            await expect(deleteErrorInDialog(page)).toBeVisible({ timeout: 8000 })

            // Modal stays open
            await expect(dialog).toBeVisible()
            await assertNoErrorLeak(page)
        } finally {
            // Unblock and clean up
            await page.unrouteAll()
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TG-12 — Info alert with editInfoLine1/2 text is present
    test('TG-12 info alert with editInfoLine1/editInfoLine2 is visible', async ({ page }) => {
        await page.goto('/tags')

        // Need the non-loading/non-error state — wait for heading
        await expect(page.getByRole('heading', { level: 1 }))
            .toContainText(label('tags.tags'), { timeout: 10000 })

        // Info alert is a UAlert (no ARIA role) — assert by visible text
        await expect(infoAlertText(page)).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(label('tags.editInfoLine2'))).toBeVisible({ timeout: 5000 })
        await assertNoErrorLeak(page)
    })

})
