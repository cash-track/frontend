// S14 — charges-filter.spec.ts — ChargesFilter (used by wallet detail)
// CF-01..CF-05: date-from/date-to inputs, calendar popover, active badges, clear, refetch params
//
// UInputDate renders as role="group" with role="spinbutton" segments — NOT role="textbox".
// The UCalendar grid (role="grid") opens via UPopover on the calendar icon button.
// Date entry is most reliable via the calendar popover: click the icon, pick a gridcell.
import { test, expect } from '@playwright/test'
import {
    label,
    createWalletViaApi, deleteWalletViaApi, createChargeViaApi, deleteChargeViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────

// UInputDate renders as role="group" with spinbutton segments inside.
// Two groups appear when the filter is open: index 0 = date-from, 1 = date-to.
const filterFromGroup = (page: import('@playwright/test').Page) =>
    page.locator('[role="group"]').nth(0)

const filterToGroup = (page: import('@playwright/test').Page) =>
    page.locator('[role="group"]').nth(1)

// Calendar icon buttons (aria-label = charges.filterInputFrom / filterInputTo)
const filterFromCalendarBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.filterInputFrom') })

const filterToCalendarBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.filterInputTo') })

// UCalendar renders role="grid" inside the popover
const calendarGrid = (page: import('@playwright/test').Page) =>
    page.locator('[role="grid"]').first()

// Available (non-disabled) calendar date cells
const availableCalendarCells = (page: import('@playwright/test').Page) =>
    page.locator('td[role="gridcell"]:not([data-disabled])')

// The clear (x) button inside a badge: aria-label = wallets.clear
const clearButtons = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('wallets.clear') })

// Active filter badge containing a date (YYYY-MM-DD pattern)
const filterBadges = (page: import('@playwright/test').Page) =>
    page.locator('span, div').filter({ hasText: /\d{4}-\d{2}-\d{2}/ })

// Helper: open the date-from calendar popover and click the first available date
async function pickDateFromCalendar(
    page: import('@playwright/test').Page,
    calendarBtn: import('@playwright/test').Locator,
) {
    await calendarBtn.click()
    await expect(calendarGrid(page)).toBeVisible({ timeout: 5000 })
    await availableCalendarCells(page).first().click()
}

test.describe('S14 — Charges Filter', () => {

    // CF-01 — Open filters → date-from/date-to input groups visible
    test('CF-01 @smoke opening the Filters section shows date input groups', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CF01 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            await wallet.toolFilters(page).click()

            // Both UInputDate groups should appear
            await expect(filterFromGroup(page)).toBeVisible({ timeout: 5000 })
            await expect(filterToGroup(page)).toBeVisible({ timeout: 5000 })

            // Calendar icon buttons are also visible
            await expect(filterFromCalendarBtn(page)).toBeVisible({ timeout: 5000 })
            await expect(filterToCalendarBtn(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CF-02 — Calendar popover opens when clicking the calendar icon
    test('CF-02 @smoke clicking calendar icon opens UCalendar with a role=grid', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CF02 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await wallet.toolFilters(page).click()
            await expect(filterFromCalendarBtn(page)).toBeVisible({ timeout: 5000 })

            // Click the calendar icon for date-from → UCalendar grid appears
            await filterFromCalendarBtn(page).click()
            await expect(calendarGrid(page)).toBeVisible({ timeout: 5000 })

            // Dismiss
            await page.keyboard.press('Escape')
            await expect(calendarGrid(page)).not.toBeVisible({ timeout: 3000 })

            // Repeat for date-to
            await filterToCalendarBtn(page).click()
            await expect(calendarGrid(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CF-03 — Setting a date via the calendar popover shows a UBadge with the date
    test('CF-03 @smoke picking a date from the calendar creates an active filter badge', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CF03 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await wallet.toolFilters(page).click()
            await expect(filterFromCalendarBtn(page)).toBeVisible({ timeout: 5000 })

            // Pick a date from the calendar
            await pickDateFromCalendar(page, filterFromCalendarBtn(page))

            // A badge containing a date string (YYYY-MM-DD) should appear
            await expect(filterBadges(page).first()).toBeVisible({ timeout: 5000 })

            // The clear (x) button should appear inside the badge
            await expect(clearButtons(page).first()).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CF-04 — Clicking the badge clear (x) resets the date; list/totals refetch
    test('CF-04 @smoke clearing a filter badge resets the date and triggers refetch', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CF04 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await wallet.toolFilters(page).click()
            await expect(filterFromCalendarBtn(page)).toBeVisible({ timeout: 5000 })

            // Set a date to create the badge
            await pickDateFromCalendar(page, filterFromCalendarBtn(page))
            const clearBtn = clearButtons(page).first()
            await expect(clearBtn).toBeVisible({ timeout: 5000 })

            // Wait for the next charges refetch after clearing
            const refetchPromise = page.waitForRequest(
                req => req.url().includes('/charges') &&
                    req.method() === 'GET' &&
                    !req.url().includes('graph'),
                { timeout: 8000 },
            )

            await clearBtn.click()

            // Badge should disappear (date cleared)
            await expect(filterBadges(page).first()).not.toBeVisible({ timeout: 5000 })

            // Refetch was triggered
            await refetchPromise

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CF-05 — Changing dates triggers getCharges + getWalletTotals with date-from/date-to params
    test('CF-05 @smoke filter changes drive getCharges and getWalletTotals with date params', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CF05 ${Date.now()}` })
        const c = await createChargeViaApi(request, w.id, { title: `E2E CF05 charge ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await wallet.toolFilters(page).click()
            await expect(filterFromCalendarBtn(page)).toBeVisible({ timeout: 5000 })

            // Intercept charges + totals requests that carry date-from
            const chargesPromise = page.waitForRequest(
                req => req.url().includes(`/wallets/${w.id}/charges`) &&
                    !req.url().includes('graph') &&
                    req.url().includes('date-from') &&
                    req.method() === 'GET',
                { timeout: 10000 },
            )
            const totalsPromise = page.waitForRequest(
                req => req.url().includes(`/wallets/${w.id}/total`) &&
                    req.url().includes('date-from') &&
                    req.method() === 'GET',
                { timeout: 10000 },
            )

            // Pick a date from the calendar — this triggers filter-change emit
            await pickDateFromCalendar(page, filterFromCalendarBtn(page))

            // Both requests must carry the date-from query param
            const chargesRequest = await chargesPromise
            expect(chargesRequest.url()).toMatch(/date-from=\d{4}-\d{2}-\d{2}/)

            const totalsRequest = await totalsPromise
            expect(totalsRequest.url()).toMatch(/date-from=\d{4}-\d{2}-\d{2}/)

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteChargeViaApi(request, w.id, c.id) } catch { /* ignore */ }
            await deleteWalletViaApi(request, w.id)
        }
    })

})
