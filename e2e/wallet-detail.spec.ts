// S5 — Wallet detail (/wallets/:id)
// Components: WalletView, WalletHeader, TotalsRow, WalletsActiveShortList
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeDelay, routeJson,
    createWalletViaApi, deleteWalletViaApi, disableWalletViaApi,
    wallet, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────
// Skeleton blocks rendered while loading (USkeleton = .animate-pulse)
const skeleton = (page: import('@playwright/test').Page) =>
    page.locator('.animate-pulse').first()

// Non-blocking switch indicator (spinner + 'Loading Data...' text)
const switchSpinner = (page: import('@playwright/test').Page) =>
    page.locator('.animate-spin').first()

// Content wrapper div (gets opacity-60 while re-loading)
const contentWrapper = (page: import('@playwright/test').Page) =>
    page.locator('.opacity-60').first()

// Status badges
const activeBadge = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.active')).first()

// emailConfirmRequired tooltip text
const emailConfirmText = (page: import('@playwright/test').Page) =>
    page.getByText(label('emailConfirmRequired')).first()

test.describe('S5 — Wallet Detail', () => {

    // WV-01 — Initial load skeleton visible, then real content
    test('WV-01 initial load shows skeleton then wallet content', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WV01 ${Date.now()}` })
        try {
            // Hold all 4 parallel GETs so skeleton is visible
            const releaseWallet = await routeDelay(page, `**/api/wallets/${w.id}`)
            const releaseTotals = await routeDelay(page, `**/api/wallets/${w.id}/total`)

            await page.goto(`/wallets/${w.id}`)

            // Skeleton should be visible while requests are pending
            await expect(skeleton(page)).toBeVisible({ timeout: 10000 })

            // Release all held requests
            releaseWallet()
            releaseTotals()

            // After release, the wallet name should appear in h2
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WV-02 — Load error (500 on wallet GET) → error alert, no content
    test('WV-02 @smoke server error shows loadingError alert', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WV02 ${Date.now()}` })
        try {
            // Use a route handler that only intercepts GET requests to the exact wallet URL
            await page.route(`**/api/wallets/${w.id}`, route => {
                if (route.request().method() === 'GET' && !route.request().url().includes('/total') && !route.request().url().includes('/users') && !route.request().url().includes('/tags') && !route.request().url().includes('/charges')) {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"E2E forced error"}',
                    })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}`)

            // Error text should appear in the alert (either EN or UK)
            await expect(
                page.getByText(new RegExp(labelStrings('wallets.loadingError').join('|'), 'i')).first(),
            ).toBeVisible({ timeout: 10000 })
            // Wallet detail heading (h2) must NOT appear (no wallet content rendered)
            await expect(wallet.detailHeading(page)).toBeHidden()
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WV-03 — Header renders: status badge, h2, Edit button, more-actions, TotalsRow
    test('WV-03 @smoke header renders all expected elements', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WV03 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)

            // Wallet name in h2
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Active status badge
            await expect(activeBadge(page)).toBeVisible()

            // Edit button — link to /wallets/{id}/edit (filter by href to avoid matching wallet
            // switcher links whose name might contain 'edit' from account data)
            await expect(
                page.locator(`a[href*="/wallets/${w.id}/edit"]`),
            ).toBeVisible()

            // More-actions button
            await expect(wallet.moreActions(page)).toBeVisible()

            // TotalsRow: the wallets.available / income / expense labels should render
            // TotalsRow renders when totals API resolves — wait for income/expense text
            await expect(
                page.getByText(label('wallets.income')).first(),
            ).toBeVisible({ timeout: 10000 })
            await expect(
                page.getByText(label('wallets.expense')).first(),
            ).toBeVisible({ timeout: 10000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WV-04 — WalletsActiveShortList: current wallet has aria-current=page; clicking another navigates
    test('WV-04 @smoke wallet switcher shows current wallet with aria-current=page', async ({ request, page }) => {
        const w1 = await createWalletViaApi(request, { name: `E2E WV04-A ${Date.now()}` })
        const w2 = await createWalletViaApi(request, { name: `E2E WV04-B ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w1.id}`)

            // Wait for detail to load
            await expect(wallet.detailHeading(page)).toContainText(w1.name, { timeout: 10000 })

            // Current wallet link should have aria-current=page
            const currentLink = page.locator(`a[href*="/wallets/${w1.id}"][aria-current="page"]`)
            await expect(currentLink).toBeVisible({ timeout: 5000 })

            // Click the second wallet in the switcher strip
            const w2Link = page.locator(`a[href*="/wallets/${w2.id}"]`).first()
            await expect(w2Link).toBeVisible({ timeout: 5000 })
            await w2Link.click()

            // URL should change to w2
            await page.waitForURL(new RegExp(`/wallets/${w2.id}`), { timeout: 10000 })
            await expect(wallet.detailHeading(page)).toContainText(w2.name, { timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w1.id)
            await deleteWalletViaApi(request, w2.id)
        }
    })

    // WV-05 — Tool buttons toggle UCollapsible; active button gets !bg-elevated class
    test('WV-05 tool buttons toggle collapsibles and get active state', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WV05 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Click Limits button (always available) — should get !bg-elevated
            const limitsBtn = wallet.toolLimits(page)
            await expect(limitsBtn).toBeVisible()
            await limitsBtn.click()
            // The class is toggled: check it has the class now
            await expect(limitsBtn).toHaveClass(/!bg-elevated/, { timeout: 3000 })

            // Click again to close — class should be gone
            await limitsBtn.click()
            await expect(limitsBtn).not.toHaveClass(/!bg-elevated/, { timeout: 3000 })

            // Repeat for Graph button
            const graphBtn = wallet.toolGraph(page)
            await graphBtn.click()
            await expect(graphBtn).toHaveClass(/!bg-elevated/, { timeout: 3000 })
            await graphBtn.click()
            await expect(graphBtn).not.toHaveClass(/!bg-elevated/, { timeout: 3000 })

            // Repeat for Filters button
            const filtersBtn = wallet.toolFilters(page)
            await filtersBtn.click()
            await expect(filtersBtn).toHaveClass(/!bg-elevated/, { timeout: 3000 })
            await filtersBtn.click()
            await expect(filtersBtn).not.toHaveClass(/!bg-elevated/, { timeout: 3000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WV-06 — Tags button disabled when wallet has no tags
    test('WV-06 Tags button is disabled when wallet has no tags', async ({ request, page }) => {
        // Route tags endpoint to return empty array
        const w = await createWalletViaApi(request, { name: `E2E WV06 ${Date.now()}` })
        try {
            // Empty tags for this wallet
            await routeJson(page, `**/api/wallets/${w.id}/tags`, [])

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Tags button should be disabled
            await expect(wallet.toolTags(page)).toBeDisabled({ timeout: 5000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WV-07 — Inactive wallet: New Charge button absent
    test('WV-07 New Charge button absent on inactive wallet', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WV07 ${Date.now()}` })
        try {
            await disableWalletViaApi(request, w.id)
            await page.goto(`/wallets/${w.id}`)

            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // New Charge button must not be present
            const newChargeBtn = page.getByRole('button', { name: label('charges.new') })
            await expect(newChargeBtn).toBeHidden()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // WV-08 — Navigate between two wallets → non-blocking spinner + opacity, content stays mounted
    test('WV-08 navigating between wallets shows non-blocking loading indicator', async ({ request, page }) => {
        const w1 = await createWalletViaApi(request, { name: `E2E WV08-A ${Date.now()}` })
        const w2 = await createWalletViaApi(request, { name: `E2E WV08-B ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w1.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w1.name, { timeout: 10000 })

            // Hold the second wallet's requests so we can observe the intermediate state
            const release = await routeDelay(page, `**/api/wallets/${w2.id}`)

            // Click the w2 link in the switcher strip
            const w2Link = page.locator(`a[href*="/wallets/${w2.id}"]`).first()
            await expect(w2Link).toBeVisible({ timeout: 5000 })
            await w2Link.click()

            // URL changes immediately to w2
            await page.waitForURL(new RegExp(`/wallets/${w2.id}`), { timeout: 5000 })

            // While loading the second wallet, the non-blocking spinner should appear
            // and the content wrapper should have opacity-60
            await expect(switchSpinner(page)).toBeVisible({ timeout: 5000 })
            // Content should remain visible (mounted) with reduced opacity
            await expect(contentWrapper(page)).toBeVisible({ timeout: 3000 })

            // Release the held request
            release()

            // After load, spinner gone and w2 content loads
            await expect(wallet.detailHeading(page)).toContainText(w2.name, { timeout: 10000 })
            await expect(switchSpinner(page)).toBeHidden()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w1.id)
            await deleteWalletViaApi(request, w2.id)
        }
    })

    // WV-09 — Email-not-confirmed gating: Edit disabled, tooltip visible, more-actions items disabled
    // The real account IS confirmed. We mock GET /api/profile to return isEmailConfirmed:false
    // so the authStore.login() call (in profileStore.setProfile) sets isEmailConfirmed=false.
    test('WV-09 email-not-confirmed disables Edit button and gates more-actions', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E WV09 ${Date.now()}` })
        try {
            // Mock profile to return isEmailConfirmed: false BEFORE the page loads.
            // App.vue calls profileStore.loadProfile() on mount → getProfile() → User.from()
            // → authStore.login(user). Setting isEmailConfirmed:false keeps the user logged in
            // but disables gated actions.
            // IMPORTANT: Currency.from() requires id, code, name, char, rate, updatedAt.
            const now = new Date().toISOString()
            await routeJson(page, '**/api/profile', {
                id: 1,
                name: 'E2E Test',
                lastName: null,
                nickName: 'e2etest',
                email: 'e2e@test.com',
                isEmailConfirmed: false,
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
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toContainText(w.name, { timeout: 10000 })

            // Edit button should be disabled (aria-disabled="true" when !isEmailConfirmed)
            // When UButton with :to is disabled, Nuxt UI strips the href and sets
            // aria-disabled="true" on the <a> element (data-slot="base").
            // The specific edit button has data-slot="base" and aria-disabled="true"
            // inside the header action area.
            const editBtn = page.locator('[data-slot="base"][aria-disabled="true"]').filter({
                hasText: label('wallets.edit'),
            })
            await expect(editBtn).toBeVisible({ timeout: 5000 })

            // Tooltip content is a portal rendered only on hover — don't assert it in DOM.
            // Instead verify the tooltip wrapper attribute by hovering the button.
            await editBtn.hover()
            // After hover, tooltip should appear
            await expect(emailConfirmText(page)).toBeVisible({ timeout: 3000 })

            // More-actions menu should show the emailConfirmRequired info label
            // type:'label' items render as DropdownMenu.Label (data-slot="label"), not role=menuitem
            await wallet.moreActions(page).click()
            await expect(
                page.locator('[data-slot="label"]').filter({ hasText: label('emailConfirmRequired') }),
            ).toBeVisible({ timeout: 3000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

})
