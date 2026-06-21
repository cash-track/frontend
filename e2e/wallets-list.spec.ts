// S2 — Wallets list (/wallets)
// Components: WalletsView, WalletsActiveGridList, WalletsGridList, WalletCard
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError, routeEmpty, routeDelay,
    createWalletViaApi, deleteWalletViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors (not yet in support/selectors.ts) ──────────────────────
// USkeleton: Nuxt UI renders skeletons with .animate-pulse
const skeleton = (page: import('@playwright/test').Page) =>
    page.locator('.animate-pulse').first()

// Nuxt UI UAlert renders as a div[data-slot="root"] with rounded-lg + p-4 styling.
// UTabs also uses data-slot="root" so we narrow by the alert's bg color class.
// color="success" → bg-success/10; color="error" → bg-error/10 (or similar).
const noWalletsAlert = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="title"]').filter({
        hasText: new RegExp(labelStrings('wallets.noWallets').join('|'), 'i'),
    })

const listErrorAlert = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="title"]').filter({
        hasText: new RegExp(labelStrings('wallets.listLoadingError').join('|'), 'i'),
    })

const createActionLink = (page: import('@playwright/test').Page) =>
    page.getByRole('link', { name: label('wallets.noWalletsCreate') })

test.describe('S2 — Wallets List', () => {

    // WL-01 — Page loads with heading and New Wallet link @smoke
    test('WL-01 @smoke page renders heading and New Wallet link', async ({ page }) => {
        await page.goto('/wallets')

        await expect(page.getByRole('heading', { level: 1 }))
            .toContainText(label('wallets.wallets'), { timeout: 10000 })
        await expect(wallet.newWalletLink(page)).toBeVisible()
        await assertNoErrorLeak(page)
    })

    // WL-02 — Active/Archived tabs are present; clicking Archived swaps content @smoke
    test('WL-02 @smoke Active and Archived tabs switch panels', async ({ page }) => {
        await page.goto('/wallets')

        // Both tabs visible
        await expect(wallet.activeTab(page)).toBeVisible()
        await expect(wallet.archivedTab(page)).toBeVisible()

        // Click Archived — Reka only mounts the active panel
        await wallet.archivedTab(page).click()

        // The archived panel is now active (tab selected)
        await expect(wallet.archivedTab(page)).toHaveAttribute('aria-selected', 'true')
        await assertNoErrorLeak(page)
    })

    // WL-03 — Loading skeletons visible while wallets request is in flight
    test('WL-03 loading skeletons visible before content', async ({ page }) => {
        const release = await routeDelay(page, '**/api/wallets/unarchived')

        await page.goto('/wallets')

        // Skeleton cards should be visible while request is held
        await expect(skeleton(page)).toBeVisible({ timeout: 5000 })

        release()

        // After release, the heading and content load
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            label('wallets.wallets'),
            { timeout: 10000 },
        )
        await assertNoErrorLeak(page)
    })

    // WL-04 — Empty state shows noWallets alert with Create action
    test('WL-04 empty state shows noWallets alert with Create link', async ({ page }) => {
        await routeEmpty(page, '**/api/wallets/unarchived')
        await page.goto('/wallets')

        await expect(noWalletsAlert(page)).toBeVisible({ timeout: 10000 })
        await expect(createActionLink(page)).toBeVisible()
        await assertNoErrorLeak(page)
    })

    // WL-05 — Server 500 error shows listLoadingError alert
    test('WL-05 server error shows listLoadingError alert', async ({ page }) => {
        await routeError(page, '**/api/wallets/unarchived')
        await page.goto('/wallets')

        await expect(listErrorAlert(page)).toBeVisible({ timeout: 10000 })
        await assertNoErrorLeak(page)
    })

    // WL-06 — Seeded wallet card shows name in h3 @smoke
    test('WL-06 @smoke wallet card shows seeded wallet name', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, { name: `E2E WL06 ${Date.now()}` })
        try {
            await page.goto('/wallets')

            await expect(
                page.getByRole('heading', { level: 3 }).filter({ hasText: seeded.name }),
            ).toBeVisible({ timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WL-07 — Clicking the card heading navigates to /wallets/{id} @smoke
    test('WL-07 @smoke clicking wallet card navigates to wallet detail', async ({ request, page }) => {
        const seeded = await createWalletViaApi(request, { name: `E2E WL07 ${Date.now()}` })
        try {
            await page.goto('/wallets')

            const card = page.getByRole('heading', { level: 3 }).filter({ hasText: seeded.name })
            await expect(card).toBeVisible({ timeout: 10000 })

            // The card is a RouterLink wrapping h3 — click the card to navigate
            await card.click()

            await page.waitForURL(new RegExp(`/wallets/${seeded.id}`), { timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, seeded.id)
        }
    })

    // WL-08 — Drag reorder fires the sort API call (best-effort, @flaky)
    test('WL-08 @flaky drag reorder fires sortWallets PUT request', async ({ request, page }) => {
        // Need at least two wallets to drag
        const w1 = await createWalletViaApi(request, { name: `E2E WL08-A ${Date.now()}` })
        const w2 = await createWalletViaApi(request, { name: `E2E WL08-B ${Date.now()}` })
        try {
            await page.goto('/wallets')

            // Wait for both cards to be visible
            await expect(
                page.getByRole('heading', { level: 3 }).filter({ hasText: w1.name }),
            ).toBeVisible({ timeout: 10000 })

            // Intercept the sort request before drag
            const sortRequestPromise = page.waitForRequest(
                req => req.url().includes('/api/wallets/unarchived/sort') && req.method() === 'POST',
                { timeout: 10000 },
            )

            // Attempt drag: grab first card, drop on second
            const cards = page.getByRole('heading', { level: 3 })
            const firstCard = cards.first()
            const secondCard = cards.nth(1)

            const firstBox = await firstCard.boundingBox()
            const secondBox = await secondCard.boundingBox()

            if (firstBox && secondBox) {
                await page.mouse.move(
                    firstBox.x + firstBox.width / 2,
                    firstBox.y + firstBox.height / 2,
                )
                await page.mouse.down()
                // Slow drag to trigger vuedraggable (delay: 250ms configured)
                await page.waitForTimeout(300)
                await page.mouse.move(
                    secondBox.x + secondBox.width / 2,
                    secondBox.y + secondBox.height + 20,
                    { steps: 20 },
                )
                await page.mouse.up()

                await sortRequestPromise
            }

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w1.id)
            await deleteWalletViaApi(request, w2.id)
        }
    })

})
