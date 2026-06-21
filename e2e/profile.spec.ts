// S13 — Profile (/profile)
// Components: ProfileView, ProfileAvatarBadge, ProfileTitle, CountersStatistics,
//             ChargesFlowStatistics, LatestWallets, CommonTags, EmailIsNotConfirmedAlert
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError, routeDelay, routeJson,
    assertNoErrorLeak,
} from './support'

// ── Local selectors ────────────────────────────────────────────────────────────

// Skeleton blocks while loading (USkeleton = .animate-pulse)
const skeleton = (page: import('@playwright/test').Page) =>
    page.locator('.animate-pulse').first()

// Profile h2 (ProfileTitle)
const profileHeading = (page: import('@playwright/test').Page) =>
    page.getByRole('heading', { level: 2 }).first()

// Counters section header (profile.counters key)
const countersHeading = (page: import('@playwright/test').Page) =>
    page.getByText(label('profile.counters')).first()

// Charges-flow notice (profile.chargesFlowNotice)
const chargesFlowNotice = (page: import('@playwright/test').Page) =>
    page.getByText(label('profile.chargesFlowNotice')).first()

// Charges-flow loading-error alert (UAlert title slot)
const chargesFlowError = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="title"]')
        .filter({ hasText: new RegExp(labelStrings('profile.chargesFlowLoadingError').join('|'), 'i') })

// Common tags heading
const commonTagsHeading = (page: import('@playwright/test').Page) =>
    page.getByText(label('profile.commonTags')).first()

// Latest wallets heading (h2 level)
const latestWalletsHeading = (page: import('@playwright/test').Page) =>
    page.getByText(label('profile.latestWallets')).first()

// EmailIsNotConfirmedAlert title
const emailNotConfirmedTitle = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="title"]')
        .filter({ hasText: new RegExp(labelStrings('profile.emailNotConfirmed').join('|'), 'i') })

// Minimal valid User payload for routeJson profile mocks.
// Currency.from() requires id, code, name, char, rate, updatedAt.
function mockUser(overrides: Record<string, unknown> = {}) {
    const now = new Date().toISOString()
    return {
        id: 99,
        name: 'E2E User',
        lastName: null,
        nickName: 'e2euser',
        email: 'e2e@example.com',
        isEmailConfirmed: true,
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
        ...overrides,
    }
}

// Minimal Wallet body for latest-wallets mock
function mockWallet(id: number, name: string) {
    const now = new Date().toISOString()
    return {
        id,
        name,
        slug: `wallet-${id}`,
        totalAmount: 100,
        isActive: true,
        isPublic: false,
        isArchived: false,
        defaultCurrencyCode: 'USD',
        defaultCurrency: {
            id: 'USD',
            code: 'USD',
            name: 'United States dollar',
            char: '$',
            rate: 1,
            updatedAt: now,
        },
        createdAt: now,
        updatedAt: now,
        users: [],
        latestCharges: [],
    }
}

// Minimal Tag body for common-tags mock (must satisfy Tag.from() — all required fields)
function mockTag(id: number, name: string) {
    const now = new Date().toISOString()
    return {
        id,
        name,
        color: '#22c55e',
        icon: null,
        userId: 99,
        createdAt: now,
        updatedAt: now,
    }
}

test.describe('S13 — Profile page', () => {

    // PR-01 — All sections render on a normal page load @smoke
    test('PR-01 @smoke all sections render without errors', async ({ page }) => {
        await page.goto('/profile')

        // Profile heading (h2) from ProfileTitle
        await expect(profileHeading(page)).toBeVisible({ timeout: 10000 })

        // Counters section
        await expect(countersHeading(page)).toBeVisible({ timeout: 10000 })

        // Charges-flow notice appears once stats load
        // It may take a moment; use a longer timeout
        await expect(chargesFlowNotice(page)).toBeVisible({ timeout: 15000 })

        // Common tags heading
        await expect(commonTagsHeading(page)).toBeVisible({ timeout: 10000 })

        // Latest wallets heading
        await expect(latestWalletsHeading(page)).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // PR-02 — Skeleton visible before profile resolves
    test('PR-02 avatar/title skeleton shown while profile loads', async ({ page }) => {
        // Hold the profile request so the skeleton is observable
        const release = await routeDelay(page, '**/api/profile')

        await page.goto('/profile')

        // Skeleton should be visible while profile hasn't loaded
        await expect(skeleton(page)).toBeVisible({ timeout: 10000 })

        // Release the held request so the page fully loads (cleanup)
        release()

        // After releasing, profile heading should eventually appear
        await expect(profileHeading(page)).toBeVisible({ timeout: 15000 })
    })

    // PR-03 — Counters section with 5 counter values
    test('PR-03 counters section shows counter values', async ({ page }) => {
        // Mock the counters endpoint with known values
        await routeJson(page, '**/api/profile/statistics/counters', {
            wallets: 3,
            walletsArchived: 1,
            charges: 42,
            chargesIncome: 10,
        })

        await page.goto('/profile')

        // Counters heading visible
        await expect(countersHeading(page)).toBeVisible({ timeout: 10000 })

        // The 5 counter values render: wallets, archived, total charges, income, expense
        // wallets=3, archived=1, charges=42, income=10, expense=32
        await expect(page.getByText('3').first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('1').first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('42').first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('10').first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('32').first()).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // PR-04 — Charges-flow stats: all 4 period rows visible + notice shown
    test('PR-04 charges-flow stats show all-time/year/quarter/month rows and notice', async ({ page }) => {
        // Mock charges-flow stats with known data
        await routeJson(page, '**/api/profile/statistics/charges-flow', {
            '+': { total: 1000, lastYear: 800, lastQuarter: 400, lastMonth: 150 },
            '-': { total: 600, lastYear: 500, lastQuarter: 200, lastMonth: 80 },
            currency: {
                id: 'USD',
                code: 'USD',
                name: 'United States dollar',
                char: '$',
                rate: 1,
                updatedAt: new Date().toISOString(),
            },
        })

        await page.goto('/profile')

        // All 4 period labels should appear (EN or UK)
        await expect(page.getByText(label('profile.allTime')).first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(label('profile.year')).first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(label('profile.quarter')).first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(label('profile.month')).first()).toBeVisible({ timeout: 10000 })

        // The notice below the stats cards
        await expect(chargesFlowNotice(page)).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // PR-05 — Charges-flow error when stats endpoint returns 500
    test('PR-05 charges-flow loading error shown on 500', async ({ page }) => {
        await routeError(page, '**/api/profile/statistics/charges-flow')

        await page.goto('/profile')

        // Error alert visible (UAlert title slot)
        await expect(chargesFlowError(page)).toBeVisible({ timeout: 10000 })
        // Intentional error test — skip assertNoErrorLeak here (app renders unknownError
        // for raw 500 in some contexts), but check the specific UI reacted correctly.
    })

    // PR-06 — Common tags chips rendered and navigable
    test('PR-06 common tags chips render', async ({ page }) => {
        // Mock common-tags endpoint with 2 tags
        await routeJson(page, '**/api/tags/common', [
            mockTag(1, 'E2E Tag Alpha'),
            mockTag(2, 'E2E Tag Beta'),
        ])

        await page.goto('/profile')

        // Tags should appear as chips
        await expect(page.getByText('E2E Tag Alpha').first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('E2E Tag Beta').first()).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // PR-07 — Latest wallets section has wallet links
    test('PR-07 latest wallets section shows wallet cards with links', async ({ page }) => {
        // Mock latest-wallets endpoint
        await routeJson(page, '**/api/profile/wallets/latest', [
            mockWallet(1001, 'E2E Mock Wallet One'),
            mockWallet(1002, 'E2E Mock Wallet Two'),
        ])

        await page.goto('/profile')

        // Wallets heading
        await expect(latestWalletsHeading(page)).toBeVisible({ timeout: 10000 })

        // Wallet names visible as headings (WalletCard uses h3)
        await expect(page.getByRole('heading', { level: 3, name: 'E2E Mock Wallet One' }))
            .toBeVisible({ timeout: 10000 })
        await expect(page.getByRole('heading', { level: 3, name: 'E2E Mock Wallet Two' }))
            .toBeVisible({ timeout: 10000 })

        // Cards are links to wallet detail pages
        await expect(page.locator('a[href*="/wallets/1001"]')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('a[href*="/wallets/1002"]')).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // PR-08 — Email-not-confirmed alert with link to /settings and dismissible
    test('PR-08 email-not-confirmed alert visible with settings link, dismissible', async ({ page }) => {
        // Mock profile to return isEmailConfirmed: false
        await routeJson(page, '**/api/profile', mockUser({ isEmailConfirmed: false }))

        await page.goto('/profile')

        // EmailIsNotConfirmedAlert title visible
        await expect(emailNotConfirmedTitle(page)).toBeVisible({ timeout: 10000 })

        // Alert contains a link to /settings (ProfileSettings button with route name='settings')
        await expect(page.locator('a[href*="/settings"]').first()).toBeVisible({ timeout: 5000 })

        // Alert is dismissible — find and click the close button
        // UAlert close button renders as a button inside the alert
        const alertEl = page.locator('[data-slot="title"]')
            .filter({ hasText: new RegExp(labelStrings('profile.emailNotConfirmed').join('|'), 'i') })
            .locator('..')
            .locator('..')
        const closeBtn = alertEl.locator('button').first()
        await expect(closeBtn).toBeVisible({ timeout: 5000 })
        await closeBtn.click()

        // Alert should disappear after dismiss
        await expect(emailNotConfirmedTitle(page)).not.toBeVisible({ timeout: 5000 })

        await assertNoErrorLeak(page)
    })

})
