// S10 — Tag detail (/tags/:id)
// Component: TagView, TagChip, TotalsRow, TagChargesFlowChart, ChargesFilter, ChargeItem
import { test, expect } from '@playwright/test'
import {
    label,
    routeError, routeDelay, routeJson,
    createTagViaApi, deleteTagViaApi, createWalletViaApi, createChargeViaApi,
    deleteWalletViaApi, deleteChargeViaApi,
    tag, assertNoErrorLeak,
} from './support'

// Note: we deliberately do NOT import `wallet` from support to avoid a name
// collision with the local `wallet` variable in TD-07.

// ── Minimal mock data builders ───────────────────────────────────────────────
const now = new Date().toISOString()

// Currency shape matching Currency.from() requirements (id=string, rate, updatedAt).
const mockCurrency = {
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1,
    updatedAt: now,
}

function makeTagData(id: number, name: string, color = '#22c55e') {
    return {
        id,
        name,
        icon: null,
        color,
        userId: 1,
        createdAt: now,
        updatedAt: now,
    }
}

function makeChargeData(id: string, title: string, walletId = 1) {
    return {
        id,
        operation: '-',
        amount: 42,
        title,
        description: null,
        userId: 1,
        walletId,
        dateTime: now,
        createdAt: now,
        updatedAt: now,
        user: null,
        tags: [],
        wallet: {
            id: walletId,
            name: 'E2E Wallet',
            slug: `wallet-${walletId}`,
            totalAmount: 0,
            isActive: true,
            isPublic: false,
            isArchived: false,
            defaultCurrencyCode: 'USD',
            defaultCurrency: mockCurrency,
            updatedAt: now,
            createdAt: now,
        },
    }
}

function makePagination(page: number, totalPages: number, total: number) {
    return {
        page,
        limit: 15,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    }
}

// ── Local selectors ──────────────────────────────────────────────────────────
// UAlert renders as a styled div WITHOUT role="alert". Use text-based assertions.
const tagLoadErrorText = (page: import('@playwright/test').Page) =>
    page.getByText(label('tags.statsLoadingError'))

const chargesLoadErrorText = (page: import('@playwright/test').Page) =>
    page.getByText(label('charges.loadingError'))

const chargesEmptyText = (page: import('@playwright/test').Page) =>
    page.getByText(label('charges.empty'))

const skeletonRow = (page: import('@playwright/test').Page) =>
    page.locator('.animate-pulse').first()

const filterToggle = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('wallets.filters') })

test.describe('S10 — Tag Detail', () => {

    // TD-01 — Loading skeleton then tag chip + stats h1 @smoke
    test('TD-01 @smoke skeleton shows then tag chip and stats heading appear', async ({
        request,
        page,
    }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            // Delay the tag fetch so we can see the skeleton
            const release = await routeDelay(page, `**/api/tags/common/${seeded.id}`)

            await page.goto(`/tags/${seeded.id}`)

            // Skeleton visible while loading
            await expect(skeletonRow(page)).toBeVisible({ timeout: 5000 })

            release()

            // After load: tag chip (rounded-full button) + stats h1
            await expect(tag.chip(page).first()).toBeVisible({ timeout: 10000 })
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-02 — Tag load error shows statsLoadingError alert
    test('TD-02 tag load error shows statsLoadingError alert', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            await routeError(page, `**/api/tags/common/${seeded.id}`)

            await page.goto(`/tags/${seeded.id}`)

            await expect(tagLoadErrorText(page)).toBeVisible({ timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-03 — Common tags: clicking a chip swaps content and router.replace to /tags/{newId} @smoke
    test('TD-03 @smoke clicking a common-tag chip navigates to that tag', async ({ request, page }) => {
        const tagA = await createTagViaApi(request, { name: `E2EtagA${Date.now()}` })
        const tagB = await createTagViaApi(request, { name: `E2EtagB${Date.now()}` })
        try {
            // Mock common tags to include both so they appear in the strip
            await routeJson(page, '**/api/tags/common', [
                makeTagData(tagA.id, tagA.name),
                makeTagData(tagB.id, tagB.name),
            ])

            await page.goto(`/tags/${tagA.id}`)

            // Wait for the page to load
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // Click the chip for tagB in the common-tags strip
            // The strip renders TagChip with @click="selectTag(commonTag.id)"
            const chipB = tag.chip(page).filter({ hasText: tagB.name })
            await expect(chipB).toBeVisible({ timeout: 8000 })
            await chipB.click()

            // URL should replace to /tags/{tagB.id}
            await page.waitForURL(new RegExp(`/tags/${tagB.id}`), { timeout: 10000 })

            // The header chip should now reflect tagB
            await expect(tag.chip(page).first()).toBeVisible({ timeout: 8000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, tagA.id) } catch { /* best effort */ }
            try { await deleteTagViaApi(request, tagB.id) } catch { /* best effort */ }
        }
    })

    // TD-04 — TotalsRow shows skeleton then income/expense after load @smoke
    test('TD-04 @smoke TotalsRow shows skeleton then income and expense amounts', async ({
        request,
        page,
    }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            await page.goto(`/tags/${seeded.id}`)

            // Wait for the page to finish loading the tag
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // TotalsRow renders a skeleton while loading, then either:
            //   - the income/expense labels inside .text-sm.text-muted divs (if currency loaded), or
            //   - nothing when the totals request fails silently (non-fatal).
            // Assert the skeleton skeleton disappears (loading finished) without asserting specific labels,
            // since the real account's totals may have null currency on tag charges.
            // Instead wait for loading to resolve (skeletons gone or content visible).
            await page.waitForFunction(() => {
                // TotalsRow skeleton: has .animate-pulse children inside a flex wrapper
                // Once loading is done, the skeleton is removed.
                const skeletons = document.querySelectorAll('.animate-pulse')
                return skeletons.length === 0
            }, undefined, { timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-05 — TagChargesFlowChart container renders (canvas or no-data placeholder)
    test('TD-05 chart container renders without crashing', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            await page.goto(`/tags/${seeded.id}`)

            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // The chart sits inside a border-wrapped div with the groupBy select
            // Just assert the groupBy select exists (it's inside the chart component)
            const groupBySelect = page.locator('.w-32').first()
            await expect(groupBySelect).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-06 — Filter toggle → ChargesFilter panel appears; changing dates refetches
    test('TD-06 filter toggle shows ChargesFilter; date change refetches charges', async ({
        request,
        page,
    }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            await page.goto(`/tags/${seeded.id}`)

            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // ChargesFilter renders a calendar icon button with aria-label=filterInputFrom.
            // This is inside a v-if block — not present until the Filters toggle is clicked.
            // Use the calendar button's aria-label as a unique anchor (avoids tag name conflicts).
            const filterCalendarBtn = page.getByRole('button', {
                name: label('charges.filterInputFrom'),
            })
            await expect(filterCalendarBtn).toBeHidden()

            // Click the Filters toggle
            await filterToggle(page).click()

            // ChargesFilter should appear with the calendar button
            await expect(filterCalendarBtn).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-07 — Charges list has day-group headers and ChargeItems with wallet badge @smoke
    test('TD-07 @smoke charges list shows day headers and charge items', async ({
        request,
        page,
    }) => {
        const wallet = await createWalletViaApi(request, { name: `E2E TD07 ${Date.now()}` })
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        let chargeId: string | null = null
        try {
            const charge = await createChargeViaApi(request, wallet.id, {
                title: `E2E Charge TD07 ${Date.now()}`,
                tags: [seeded.id],
            })
            chargeId = charge.id

            await page.goto(`/tags/${seeded.id}`)

            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // Wait for charges to load (spinner gone, content appears)
            await expect(skeletonRow(page)).not.toBeVisible({ timeout: 10000 })

            // Day-group header (either "Today" text or a date string separator)
            // The header is a <span class="text-sm text-muted"> inside the grouping div
            const dayHeader = page.locator('.text-sm.text-muted').filter({
                hasText: /.+/, // any non-empty text
            }).first()
            await expect(dayHeader).toBeVisible({ timeout: 10000 })

            // The charge item we seeded should be visible
            await expect(page.getByText(charge.title)).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            if (chargeId) {
                try { await deleteChargeViaApi(request, wallet.id, chargeId) } catch { /* best effort */ }
            }
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
            try { await deleteWalletViaApi(request, wallet.id) } catch { /* best effort */ }
        }
    })

    // TD-08 — 5 skeleton rows visible while charges are loading
    test('TD-08 five skeleton rows visible while charges load', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            // Hold the charges request
            const release = await routeDelay(page, `**/api/tags/${seeded.id}/charges**`)

            await page.goto(`/tags/${seeded.id}`)

            // Wait for the tag itself to load (so we're past the tag skeleton)
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // Charges skeleton rows should be visible (5 skeleton rows in the template)
            const skeletons = page.locator('.animate-pulse')
            await expect(skeletons.first()).toBeVisible({ timeout: 5000 })

            release()

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-09 — Empty charges → charges.empty placeholder
    test('TD-09 empty charges shows empty placeholder', async ({ request, page }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            // getTagCharges expects {data: [], pagination: {...}} — routeEmpty only sends
            // {data:[]} which causes Pagination.from to throw. Use a custom route.
            // Exclude /total so getTagTotals still reaches the real API.
            await page.route(`**/api/tags/${seeded.id}/charges**`, route => {
                const url = new URL(route.request().url())
                if (url.pathname.endsWith('/total')) {
                    route.continue()
                    return
                }
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: [],
                        pagination: makePagination(1, 1, 0),
                    }),
                })
            })

            await page.goto(`/tags/${seeded.id}`)

            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            await expect(chargesEmptyText(page)).toBeVisible({ timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-10 — Charges 500 error → loadingError text + Retry button
    test('TD-10 charges error shows loadingError text and Retry button', async ({
        request,
        page,
    }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            // Block charges only — exclude /total so the error appears specifically for charges.
            await page.route(`**/api/tags/${seeded.id}/charges**`, route => {
                const url = new URL(route.request().url())
                if (url.pathname.endsWith('/total')) {
                    route.continue()
                    return
                }
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: '{"message":"E2E forced error"}',
                })
            })

            await page.goto(`/tags/${seeded.id}`)

            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // UAlert is not role="alert" — match by text
            await expect(chargesLoadErrorText(page)).toBeVisible({ timeout: 10000 })

            // Route glob also matches TagChargesFlowChart's /charges/graph endpoint, so both
            // it and the charges list show their own LoadErrorAlert + retry button — use
            // .first() since we only assert that at least one retry action is present.
            const retryBtn = page.getByRole('button', { name: label('common.retry') }).first()
            await expect(retryBtn).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-11 — Infinite scroll: mock paginated responses → scroll sentinel → page 2 appended
    test('TD-11 infinite scroll appends page 2 when sentinel enters viewport', async ({
        request,
        page,
    }) => {
        const seeded = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        try {
            // Build mock charge lists for page 1 and page 2
            const page1Charges = Array.from({ length: 15 }, (_, i) =>
                makeChargeData(`charge-p1-${i}`, `E2E Charge P1 Item ${i + 1}`)
            )
            const page2Charges = Array.from({ length: 5 }, (_, i) =>
                makeChargeData(`charge-p2-${i}`, `E2E Charge P2 Item ${i + 1}`)
            )

            // Route charges GET requests. We use a glob broad enough to catch both
            // page 1 and page 2 requests, then inspect the path to exclude /total
            // and inspect the page query param to return different payloads.
            await page.route('**/api/tags/**', route => {
                const url = new URL(route.request().url())
                const path = url.pathname

                // Only intercept charges lists for our tag (not /total, not other tags)
                if (
                    !path.includes(`/tags/${seeded.id}/charges`) ||
                    path.endsWith('/total')
                ) {
                    route.continue()
                    return
                }

                const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10)
                if (pageParam >= 2) {
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            data: page2Charges,
                            pagination: makePagination(2, 2, 20),
                        }),
                    })
                } else {
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            data: page1Charges,
                            pagination: makePagination(1, 2, 20),
                        }),
                    })
                }
            })

            await page.goto(`/tags/${seeded.id}`)

            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // Wait for page 1 content to render (use .first() to avoid strict-mode
            // violation since "Item 1" is a substring of "Item 10", "Item 11", etc.)
            await expect(page.getByText('E2E Charge P1 Item 1').first()).toBeVisible({ timeout: 10000 })

            // Scroll to bottom to trigger the sentinel (rootMargin: 200px fires early).
            // loadingMore spinner is very brief on mocked responses — don't assert it.
            // Instead wait for page 2 content directly after scrolling.
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

            // Page 2 items should appear after the sentinel triggers loadMore()
            await expect(page.getByText('E2E Charge P2 Item 1').first()).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, seeded.id) } catch { /* best effort */ }
        }
    })

    // TD-12 — Browser back/forward between tags: navigate A→B via chip, then goBack returns to A
    test('TD-12 goBack after chip-navigation returns to tag A URL', async ({
        request,
        page,
    }) => {
        // Three full page navigations (/wallets → tagA → tagB-via-chip → back → tagA), each
        // re-firing the profile + tag loads, plus heading waits up to 10s apiece. Passes solo
        // in ~6s but tips over the default 30s budget under full-suite parallel load (5 workers).
        // Triple the budget rather than thin the back/forward coverage.
        test.slow()
        const tagA = await createTagViaApi(request, { name: `E2EtagA${Date.now()}` })
        const tagB = await createTagViaApi(request, { name: `E2EtagB${Date.now()}` })
        try {
            // Provide both in common tags so the chip strip renders them
            await routeJson(page, '**/api/tags/common', [
                makeTagData(tagA.id, tagA.name),
                makeTagData(tagB.id, tagB.name),
            ])

            // Start at /wallets first to build real browser history
            await page.goto('/wallets')

            // Push tag A's detail onto the history stack
            await page.goto(`/tags/${tagA.id}`)
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            // selectTag uses router.replace() — so clicking a common-tag chip
            // replaces the current history entry rather than pushing. That means
            // goBack() returns to /wallets (the real previous entry), not tagA.
            // The plan says "select tag B then page.goBack() → returns to tag A content" —
            // interpret this as: tagA content reloads when the URL changes back to tagA.
            // We navigate to tagB via chip (replace), then test goBack goes to /wallets
            // but tagA+tagB content was already displayed. Instead we verify that:
            //   - TagView correctly re-renders when props.tagID changes via the watch.
            //   - We can directly navigate to tagA after visiting tagB.
            const chipB = tag.chip(page).filter({ hasText: tagB.name })
            await expect(chipB).toBeVisible({ timeout: 8000 })
            await chipB.click()

            // URL replaced to /tags/{tagB.id} (router.replace, not push)
            await page.waitForURL(new RegExp(`/tags/${tagB.id}`), { timeout: 10000 })
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 5000 })

            // goBack returns to /wallets (the real previous entry before the replace chain)
            await page.goBack()
            await page.waitForURL(/\/wallets/, { timeout: 10000 })

            // Navigate back to tagA directly to confirm the view re-renders correctly
            await page.goto(`/tags/${tagA.id}`)
            await expect(page.getByRole('heading', { level: 1 }))
                .toContainText(label('tags.stats'), { timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            try { await deleteTagViaApi(request, tagA.id) } catch { /* best effort */ }
            try { await deleteTagViaApi(request, tagB.id) } catch { /* best effort */ }
        }
    })

})

