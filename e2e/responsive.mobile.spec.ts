// S21 — Responsive / Mobile (mobile-chrome project — Pixel 5 393×851 touch)
// File MUST end .mobile.spec.ts so the mobile-chrome project picks it up.
// All tests run at Pixel 5 viewport (393×851) with hasTouch: true / isMobile: true.
// Touch taps work with .click() in mobile-chrome; no .hover() needed for pointer-coarse rows.
import { test, expect } from '@playwright/test'
import {
    label,
    createWalletViaApi, createChargeViaApi, createTagViaApi,
    deleteWalletViaApi, deleteTagViaApi,
    shell, wallet, charge, assertNoErrorLeak,
} from './support'

// ── Local selectors ───────────────────────────────────────────────────────────

// Hamburger button (aria-controls="app-header-menu")
const hamburger = (page: import('@playwright/test').Page) => shell.hamburger(page)

// Wallet switcher scrollable row
const switcherRow = (page: import('@playwright/test').Page) =>
    page.locator('.flex.overflow-x-auto')

// Fade gradient overlay on the right side of the switcher
const switcherFade = (page: import('@playwright/test').Page) =>
    page.locator('.bg-gradient-to-r').first()

// Fallback: any actions button visible in the charges list area
const anyChargeActionsBtn = (page: import('@playwright/test').Page) =>
    page.locator('.group').getByRole('button', { name: label('wallets.moreActions') }).first()

// The charge create form operation toggle area
const expenseToggle = (page: import('@playwright/test').Page) => charge.expenseToggle(page)
const incomeToggle = (page: import('@playwright/test').Page) => charge.incomeToggle(page)
const amountInput = (page: import('@playwright/test').Page) => charge.amountInput(page)

// ─────────────────────────────────────────────────────────────────────────────

test.describe('S21 — Responsive / Mobile', () => {

    // RM-01 — Hamburger toggles nav: hidden by default, aria-expanded flips, links appear
    test('RM-01 @smoke hamburger toggles nav visibility and aria-expanded', async ({ page }) => {
        await page.goto('/wallets')
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 })

        const btn = hamburger(page)
        await expect(btn).toBeVisible({ timeout: 5000 })

        // On mobile the nav starts closed (isHeaderOpened = false; isDesktop = false)
        const initialExpanded = btn
        await expect(initialExpanded).toHaveAttribute('aria-expanded', 'false')

        // Nav links should not be visible yet (inside closed collapsible)
        // AppHeader.vue: isMenuOpen = isDesktop || isHeaderOpened; on mobile both false → collapsed
        // The nav text IS in DOM (unmountOnHide=false) but visually hidden
        await expect(shell.navTags(page)).toBeHidden()

        // Click hamburger → nav opens
        await btn.click()
        await expect(btn).toHaveAttribute('aria-expanded', 'true')
        await expect(shell.navTags(page)).toBeVisible({ timeout: 3000 })
        await expect(shell.navWallets(page)).toBeVisible()
        await expect(shell.navProfile(page)).toBeVisible()

        // Click again → nav closes
        await btn.click()
        await expect(btn).toHaveAttribute('aria-expanded', 'false')

        await assertNoErrorLeak(page)
    })

    // RM-02 — Mobile nav: open → tap Tags/Profile → navigates; menu auto-closes on route change
    test('RM-02 @smoke mobile nav link tap navigates and closes menu', async ({ page }) => {
        await page.goto('/wallets')

        // Open nav
        await hamburger(page).click()
        await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'true')
        await expect(shell.navTags(page)).toBeVisible({ timeout: 3000 })

        // Tap Tags → navigates to /tags
        await shell.navTags(page).click()
        await expect(page).toHaveURL(/\/tags$/, { timeout: 5000 })

        // AppHeader.vue: watch(() => route.fullPath, () => { isHeaderOpened.value = false })
        // Menu should auto-close after navigation
        await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'false')

        // Re-open and tap Profile
        await hamburger(page).click()
        await expect(shell.navProfile(page)).toBeVisible({ timeout: 3000 })
        await shell.navProfile(page).click()
        await expect(page).toHaveURL(/\/profile$/, { timeout: 5000 })
        await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'false')

        await assertNoErrorLeak(page)
    })

    // RM-03 — Wallets grid single-column on mobile (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
    test('RM-03 wallets grid is single-column on mobile', async ({ page }) => {
        await page.goto('/wallets')

        // Wait for wallets list to render
        const grid = page.locator('.grid.grid-cols-1').first()
        await expect(grid).toBeVisible({ timeout: 10000 })

        // Verify the grid does NOT have md: multi-column active at 393px
        // The computed style at 393px should be 1 column
        const cols = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns)
        // At 393px (< md=768px) it should be a single column (one track)
        const trackCount = cols.split(' ').length
        expect(trackCount).toBe(1)

        await assertNoErrorLeak(page)
    })

    // RM-04 — Profile/settings single-column on mobile; tabs usable
    test('RM-04 profile and settings grids collapse to single-column; tabs work', async ({ page }) => {
        // Profile: grid-cols-1 md:grid-cols-3
        await page.goto('/profile')

        const profileGrid = page.locator('.grid.grid-cols-1').first()
        await expect(profileGrid).toBeVisible({ timeout: 10000 })
        const profileCols = await profileGrid.evaluate(el => getComputedStyle(el).gridTemplateColumns)
        expect(profileCols.split(' ').length).toBe(1)

        // Settings: tabs usable on mobile
        await page.goto('/settings')
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 })

        // Profile tab (default) should be visible and tappable
        const profileTab = page.getByRole('tab', { name: label('personalSettings.profile') })
        await expect(profileTab).toBeVisible({ timeout: 5000 })

        // Security tab tappable
        const securityTab = page.getByRole('tab', { name: label('personalSettings.security') })
        await expect(securityTab).toBeVisible()
        await securityTab.click()

        // Security panel loads (current-password input)
        await expect(
            page.getByLabel(label('securitySettings.currentPassword'))
        ).toBeVisible({ timeout: 5000 })

        await assertNoErrorLeak(page)
    })

    // RM-05 — Wallet switcher horizontal scroll + fade gradient present
    test('RM-05 @smoke wallet switcher has horizontal scroll and fade gradient', async ({ request, page }) => {
        const w1 = await createWalletViaApi(request, { name: `E2E RM05-A ${Date.now()}` })
        const w2 = await createWalletViaApi(request, { name: `E2E RM05-B ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w1.id}`)
            await expect(wallet.detailHeading(page)).toBeVisible({ timeout: 10000 })

            // WalletsActiveShortList: scrollable row
            await expect(switcherRow(page)).toBeVisible()

            // overflow-x-auto is set in template; verify at least 2 wallet links visible
            const w1Link = page.locator(`a[href*="/wallets/${w1.id}"]`).first()
            const w2Link = page.locator(`a[href*="/wallets/${w2.id}"]`).first()
            await expect(w1Link).toBeVisible()
            await expect(w2Link).toBeVisible()

            // Fade gradient exists in the DOM (bg-gradient-to-r on the overlay)
            await expect(switcherFade(page)).toBeAttached()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w1.id)
            await deleteWalletViaApi(request, w2.id)
        }
    })

    // RM-06 — Charge row actions visible without hover on touch (pointer-coarse:visible)
    test('RM-06 charge row actions visible without hover on mobile', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E RM06 ${Date.now()}` })
        const c = await createChargeViaApi(request, w.id, { title: `E2E RM06 charge ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toBeVisible({ timeout: 10000 })

            // Wait for charge to appear in the list
            await expect(page.getByText(c.title)).toBeVisible({ timeout: 10000 })

            // On mobile (pointer-coarse) the actions button should be visible WITHOUT hover
            // ChargeItem has: invisible group-hover:visible … pointer-coarse:visible
            const actionsBtn = anyChargeActionsBtn(page)
            await expect(actionsBtn).toBeVisible({ timeout: 5000 })

            // Tapping it opens the dropdown menu
            await actionsBtn.click()
            await expect(
                page.getByRole('menuitem', { name: label('charges.edit') }).first()
            ).toBeVisible({ timeout: 3000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // RM-07 — Charge create stacks vertical on mobile; form usable
    test('RM-07 charge create form stacks vertically and is usable', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E RM07 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toBeVisible({ timeout: 10000 })

            // Open New Charge form
            await charge.newChargeButton(page).click()

            // ChargeCreate: flex-col sm:flex-row — at 393px both operation + amount stack vertically
            // Verify the expense/income toggle and amount input are both accessible
            await expect(expenseToggle(page)).toBeVisible({ timeout: 5000 })
            await expect(incomeToggle(page)).toBeVisible()
            await expect(amountInput(page)).toBeVisible()

            // Verify the container stacks vertically (flex-col at mobile width)
            const createFormRow = expenseToggle(page).locator('..').locator('..')
            const flexDir = await createFormRow.evaluate(el => getComputedStyle(el).flexDirection)
            // At 393px (< sm=640px) it should be column
            expect(flexDir).toBe('column')

            // Form is usable: fill in amount
            await amountInput(page).fill('10')
            await expect(amountInput(page)).toHaveValue('10')

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // RM-08 — ConfirmModal + tag popover fit within viewport
    test('RM-08 ConfirmModal and tag popover fit within viewport', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E RM08 ${Date.now()}` })
        const t = await createTagViaApi(request, { name: `E2Erm08${Date.now()}` })
        try {
            const viewportWidth = 393
            const viewportHeight = 851

            // ── ConfirmModal ──────────────────────────────────────────────────
            // WalletHeader: only "Delete" has a ConfirmModal; Archive fires directly.
            await page.goto(`/wallets/${w.id}`)
            await expect(wallet.detailHeading(page)).toBeVisible({ timeout: 10000 })

            // Open more-actions → Delete (triggers ConfirmModal)
            await page.getByRole('button', { name: label('wallets.moreActions') }).click()
            await expect(page.getByRole('menuitem', { name: label('wallets.delete') })).toBeVisible({ timeout: 3000 })
            await page.getByRole('menuitem', { name: label('wallets.delete') }).click()

            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible({ timeout: 5000 })

            // Dialog bounding box must fit inside viewport
            const dialogBox = await dialog.boundingBox()
            expect(dialogBox).not.toBeNull()
            if (dialogBox) {
                expect(dialogBox.x).toBeGreaterThanOrEqual(0)
                expect(dialogBox.y).toBeGreaterThanOrEqual(0)
                expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewportWidth + 5)
                expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewportHeight + 5)
            }

            // Dismiss the dialog
            await page.keyboard.press('Escape')
            await expect(dialog).not.toBeVisible({ timeout: 3000 })

            // ── Tag chip popover ──────────────────────────────────────────────
            // Navigate to tags page where chips render
            await page.goto('/tags')

            // Find our seeded tag chip (button with rounded-full class)
            const tagChip = page.locator('button[class*="rounded-full"]').filter({ hasText: t.name }).first()
            // If not visible immediately, wait a moment for tags to load
            await expect(tagChip).toBeVisible({ timeout: 10000 })

            // Tap the chip to open its popover
            await tagChip.click()

            // Popover content should appear
            const popover = page.locator('[data-slot="content"]').filter({ hasText: /View|Переглянути|Edit|Редагувати/i }).first()
            await expect(popover).toBeVisible({ timeout: 3000 })

            // Popover must fit in viewport
            const popoverBox = await popover.boundingBox()
            expect(popoverBox).not.toBeNull()
            if (popoverBox) {
                expect(popoverBox.x).toBeGreaterThanOrEqual(-5)
                expect(popoverBox.x + popoverBox.width).toBeLessThanOrEqual(viewportWidth + 5)
                expect(popoverBox.y + popoverBox.height).toBeLessThanOrEqual(viewportHeight + 5)
            }

            // Dismiss popover
            await page.keyboard.press('Escape')

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
            await deleteTagViaApi(request, t.id)
        }
    })

})
