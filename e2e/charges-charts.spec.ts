// S18 — charges-charts.spec.ts — charts (ChargesFlowChart, ChargesTotalChart)
// CH-01..CH-05: containers render, groupBy triggers network call, empty, error, tag/date reload
// Charts are <canvas> — assert container/controls/no-data text, NEVER pixels.
//
// USelect in real browser (E2E) has role="combobox" + role="option" listbox items,
// unlike unit tests where jsdom blocks them. The options appear in a portal but are
// queryable via getByRole('option').
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError, routeJson,
    createWalletViaApi, deleteWalletViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────

// The groupBy USelect trigger inside ChargesFlowChart
// It is the only role=combobox on the wallet detail page
const groupByCombobox = (page: import('@playwright/test').Page) =>
    page.getByRole('combobox')

// Group-by option items in the listbox (after clicking the combobox)
const groupByOption = (page: import('@playwright/test').Page, text: RegExp) =>
    page.locator('[role="option"]').filter({ hasText: text }).first()

// The groupBy label text (static label next to the combobox)
const groupByLabel = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.groupBy')).first()

// Chart no-data text (rendered when all chart data is zero)
const noDataText = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('wallets.chartNoData').join('|'), 'i')).first()

// Chart load error text
const chartErrorText = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('wallets.chartLoadingError').join('|'), 'i')).first()

// Expense / income section headings rendered by ChargesTotalChart
const expenseHeading = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.expense')).first()

const incomeHeading = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.income')).first()

// Calendar icon button for date-from filter
const filterFromCalendarBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('charges.filterInputFrom') })

// Available calendar date cells
const availableCalendarCells = (page: import('@playwright/test').Page) =>
    page.locator('td[role="gridcell"]:not([data-disabled])')

test.describe('S18 — Charges Charts', () => {

    // CH-01 — Graph section renders both chart containers (flow + total)
    test('CH-01 @smoke Graph section shows both chart containers', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CH01 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            await wallet.toolGraph(page).click()

            // Both charts render inside the collapsible.
            // ChargesFlowChart has the "Group By" label + combobox.
            // ChargesTotalChart has Expense/Income headings.
            await expect(groupByLabel(page)).toBeVisible({ timeout: 10000 })
            await expect(groupByCombobox(page)).toBeVisible({ timeout: 5000 })
            await expect(expenseHeading(page)).toBeVisible({ timeout: 10000 })
            await expect(incomeHeading(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CH-02 — groupBy control: Day/Month/Year → triggers a network call each time
    test('CH-02 @smoke changing groupBy triggers a new chart data request', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CH02 ${Date.now()}` })
        try {
            const monthLabel = new RegExp(labelStrings('wallets.groupByMonth').join('|'), 'i')
            const yearLabel = new RegExp(labelStrings('wallets.groupByYear').join('|'), 'i')

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Set up the month request interceptor BEFORE opening the graph (race-safe)
            const monthRequest = page.waitForRequest(
                req => req.url().includes('/charges/graph/amount') && req.url().includes('group-by=month'),
                { timeout: 15000 },
            )

            await wallet.toolGraph(page).click()
            await expect(groupByCombobox(page)).toBeVisible({ timeout: 10000 })

            // Give the initial graph load time to complete before interacting
            // (onMounted fires graph/amount?group-by=day; we wait for it to settle)
            await page.waitForTimeout(1500)

            // Switch to Month
            await groupByCombobox(page).click()
            await expect(groupByOption(page, monthLabel)).toBeVisible({ timeout: 5000 })
            await groupByOption(page, monthLabel).click()
            await monthRequest

            // Switch to Year
            const yearRequest = page.waitForRequest(
                req => req.url().includes('/charges/graph/amount') && req.url().includes('group-by=year'),
                { timeout: 10000 },
            )
            await groupByCombobox(page).click()
            await expect(groupByOption(page, yearLabel)).toBeVisible({ timeout: 5000 })
            await groupByOption(page, yearLabel).click()
            await yearRequest

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CH-03 — Route empty graph data → wallets.chartNoData text
    test('CH-03 empty graph data shows chartNoData message', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CH03 ${Date.now()}` })
        try {
            // Return empty arrays for both graph endpoints before page load
            await routeJson(page, `**/api/wallets/${w.id}/charges/graph/amount`, [])
            await routeJson(page, `**/api/wallets/${w.id}/charges/graph/total`, [])

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await wallet.toolGraph(page).click()

            await expect(groupByLabel(page)).toBeVisible({ timeout: 10000 })

            // The flow chart should show chartNoData (no non-zero datapoints)
            await expect(noDataText(page)).toBeVisible({ timeout: 8000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CH-04 — Route 500 → wallets.chartLoadingError
    // Intentional error test — skip assertNoErrorLeak.
    test('CH-04 chart load error shows chartLoadingError message', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CH04 ${Date.now()}` })
        try {
            await routeError(page, `**/api/wallets/${w.id}/charges/graph/**`)

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await wallet.toolGraph(page).click()

            // The chartLoadingError text should appear in the alert
            await expect(chartErrorText(page)).toBeVisible({ timeout: 10000 })
            // skip assertNoErrorLeak — intentional error test
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CH-05 — Selecting a date filter while graph is open reloads both charts (reload() path)
    test('CH-05 @smoke setting a date filter triggers chart reload', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CH05 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Open Graph first so reload() will be triggered on filter change
            await wallet.toolGraph(page).click()
            await expect(groupByLabel(page)).toBeVisible({ timeout: 10000 })

            // Give chart a moment to load (initial graph request fires on mount)
            await page.waitForTimeout(2000)

            // Open Filters section
            await wallet.toolFilters(page).click()
            await expect(filterFromCalendarBtn(page)).toBeVisible({ timeout: 5000 })

            // Intercept the graph/amount reload with date-from param
            const graphReloadPromise = page.waitForRequest(
                req => req.url().includes('/charges/graph/amount') && req.url().includes('date-from'),
                { timeout: 10000 },
            )

            // Pick a date from the calendar to trigger filter-change → reload()
            await filterFromCalendarBtn(page).click()
            await expect(page.locator('[role="grid"]').first()).toBeVisible({ timeout: 5000 })
            await availableCalendarCells(page).first().click()

            // Chart reload should fire with date-from param
            const graphRequest = await graphReloadPromise
            expect(graphRequest.url()).toMatch(/date-from=\d{4}-\d{2}-\d{2}/)

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

})
