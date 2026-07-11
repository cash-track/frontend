// S7 — Wallet share (/wallets/:id/share)
// Components: WalletShareView, WalletShare, WalletSharedMember
// Cases: SH-01..SH-09
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError, routeJson,
    createWalletViaApi, deleteWalletViaApi,
    assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────
// Page title: "Members of <wallet name>"
const shareTitle = (page: import('@playwright/test').Page) =>
    page.getByRole('heading', { level: 2 })

// Members load failure alert — UAlert renders as role=alert but search by text is more robust
const membersErrorAlert = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('wallets.shareMembersLoadingError').join('|'), 'i')).first()

// Common users separator label — USeparator renders the label prop as inline text content
const commonUsersSep = (page: import('@playwright/test').Page) =>
    page.getByText(label('wallets.shareCommonUsers')).first()

// Email input (type=email) for user search
const emailInput = (page: import('@playwright/test').Page) =>
    page.locator('input[type="email"]').first()

// Search button
const searchBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('wallets.shareSearch') })

// Invite button (appears after finding a user)
const inviteBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('wallets.shareInvite') })

// Search error message (field-level error)
const searchError = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('wallets.shareSearchError').join('|'), 'i')).first()

// Invite error — non-422 general error, rendered by LoadErrorAlert via :title (no toast:
// WalletShare shows a single specific inline message rather than a duplicate toast)
const inviteErrorAlert = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="title"]').filter({
        hasText: new RegExp(labelStrings('wallets.shareInviteError').join('|'), 'i'),
    }).first()

// Back/close button (aria-label = wallets.shareBack)
const backBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('wallets.shareBack') })

// Minimal User objects for mocking.
// Note: Currency.from() requires id, code, name, char, rate, updatedAt.
// Use null defaultCurrency to avoid parsing issues.
function mockUser(id: number, name: string): Record<string, unknown> {
    const now = new Date().toISOString()
    return {
        id,
        name,
        lastName: null,
        nickName: `user${id}`,
        email: `user${id}@example.com`,
        isEmailConfirmed: true,
        photoUrl: null,
        defaultCurrencyCode: null,
        defaultCurrency: null,
        locale: 'en',
        createdAt: now,
        updatedAt: now,
    }
}

test.describe('S7 — Wallet Share', () => {

    // SH-01 — Page renders title (wallets.shareTitle + wallet name) and members list
    test('SH-01 @smoke share page renders title and members', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH01 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}/share`)

            // Title h2 contains "Members of" + wallet name
            await expect(shareTitle(page)).toContainText(
                new RegExp(labelStrings('wallets.shareTitle').join('|'), 'i'),
                { timeout: 10000 },
            )
            await expect(shareTitle(page)).toContainText(w.name, { timeout: 3000 })

            // Search section should be present
            await expect(emailInput(page)).toBeVisible({ timeout: 5000 })
            await expect(searchBtn(page)).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-02 — Members GET error → shareMembersLoadingError alert
    test('SH-02 members load failure shows error alert', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH02 ${Date.now()}` })
        try {
            // Force error on both users endpoints (wallet users + common wallets)
            await routeError(page, `**/api/wallets/${w.id}/users`)
            await routeError(page, '**/api/users/find/by-common-wallets')

            await page.goto(`/wallets/${w.id}/share`)

            await expect(membersErrorAlert(page)).toBeVisible({ timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-03 — Common-users suggestions appear when the endpoint returns users
    test('SH-03 common users suggestions shown when endpoint returns users', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH03 ${Date.now()}` })
        try {
            // Mock the common-wallets endpoint with one user
            const user = mockUser(8001, 'Common User SH03')
            await routeJson(page, '**/api/users/find/by-common-wallets', [user])
            // Wallet users = empty so the common user isn't filtered out as a member
            await routeJson(page, `**/api/wallets/${w.id}/users`, [])

            await page.goto(`/wallets/${w.id}/share`)

            // The separator label should appear
            await expect(commonUsersSep(page)).toBeVisible({ timeout: 10000 })

            // The user's display name should appear
            await expect(page.getByText('Common User SH03').first()).toBeVisible()

            // A Select button should be visible for them
            await expect(
                page.getByRole('button', { name: label('wallets.shareSelect') }).first(),
            ).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-04 — Search by email → found user with Invite button
    test('SH-04 @smoke search by email shows found user with Invite button', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH04 ${Date.now()}` })
        try {
            const foundUser = mockUser(8002, 'Found User SH04')
            // Mock the by-email endpoint (the email is URL-encoded in the path)
            await routeJson(page, '**/api/users/find/by-email/**', foundUser)
            // Empty common-wallets so we don't get noise
            await routeJson(page, '**/api/users/find/by-common-wallets', [])
            await routeJson(page, `**/api/wallets/${w.id}/users`, [])

            await page.goto(`/wallets/${w.id}/share`)
            await expect(emailInput(page)).toBeVisible({ timeout: 10000 })

            // Type an email and search
            await emailInput(page).fill('found@example.com')
            await searchBtn(page).click()

            // Found user row appears with display name
            await expect(page.getByText('Found User SH04').first()).toBeVisible({ timeout: 5000 })
            // Invite button appears
            await expect(inviteBtn(page)).toBeVisible()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-05 — Search failure → field error shareSearchError
    test('SH-05 search failure shows shareSearchError field error', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH05 ${Date.now()}` })
        try {
            // Force the user search to return 404/500
            await routeError(page, '**/api/users/find/by-email/**', 404)
            await routeJson(page, '**/api/users/find/by-common-wallets', [])
            await routeJson(page, `**/api/wallets/${w.id}/users`, [])

            await page.goto(`/wallets/${w.id}/share`)
            await expect(emailInput(page)).toBeVisible({ timeout: 10000 })

            await emailInput(page).fill('notfound@example.com')
            await searchBtn(page).click()

            // Field error should appear
            await expect(searchError(page)).toBeVisible({ timeout: 5000 })
            // No Invite button should be visible
            await expect(inviteBtn(page)).toBeHidden()

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-06 — Invite → user moves to members, input cleared
    test('SH-06 @smoke Invite adds user to members list and clears input', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH06 ${Date.now()}` })
        try {
            const foundUser = mockUser(8003, 'Invited User SH06')
            await routeJson(page, '**/api/users/find/by-email/**', foundUser)
            await routeJson(page, '**/api/users/find/by-common-wallets', [])
            await routeJson(page, `**/api/wallets/${w.id}/users`, [])
            // PATCH /api/wallets/{id}/users/{userId} → success
            await page.route(`**/api/wallets/${w.id}/users/**`, route => {
                if (route.request().method() === 'PATCH') {
                    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}/share`)
            await expect(emailInput(page)).toBeVisible({ timeout: 10000 })

            await emailInput(page).fill('invite@example.com')
            await searchBtn(page).click()

            await expect(inviteBtn(page)).toBeVisible({ timeout: 5000 })
            await inviteBtn(page).click()

            // User's display name should appear in the members list
            await expect(page.getByText('Invited User SH06').first()).toBeVisible({ timeout: 5000 })

            // Email input should be cleared (search form re-shown)
            // After invite, foundUser becomes null and email is cleared → input re-appears empty
            await expect(emailInput(page)).toBeVisible({ timeout: 3000 })
            await expect(emailInput(page)).toHaveValue('')

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-07 — Invite error (non-422) → single specific inline LoadErrorAlert: Show details,
    // no Retry (mutating action). No toast — the inline alert is the sole error surface.
    test('SH-07 invite API error shows a specific alert with Show details and no Retry', async ({
        request,
        page,
    }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH07 ${Date.now()}` })
        try {
            const foundUser = mockUser(8004, 'Error User SH07')
            await routeJson(page, '**/api/users/find/by-email/**', foundUser)
            await routeJson(page, '**/api/users/find/by-common-wallets', [])
            await routeJson(page, `**/api/wallets/${w.id}/users`, [])
            // Force PATCH (shareWallet) to 500
            await page.route(`**/api/wallets/${w.id}/users/**`, route => {
                if (route.request().method() === 'PATCH') {
                    return route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: '{"message":"forced error"}',
                    })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}/share`)
            await expect(emailInput(page)).toBeVisible({ timeout: 10000 })

            await emailInput(page).fill('error@example.com')
            await searchBtn(page).click()

            await expect(inviteBtn(page)).toBeVisible({ timeout: 5000 })
            await inviteBtn(page).click()

            // The specific invite-error message appears in the inline alert (never the
            // generic "Unknown error" fallback, so assertNoErrorLeak stays meaningful below)
            await expect(inviteErrorAlert(page)).toBeVisible({ timeout: 10000 })

            // Show details toggle present and functional
            const showDetailsBtn = page.getByRole('button', { name: label('common.showDetails') })
            await expect(showDetailsBtn).toBeVisible()
            await showDetailsBtn.click()
            await expect(
                page.getByRole('button', { name: label('common.hideDetails') }),
            ).toBeVisible()

            // No Retry — inviting is a mutating action, never retryable
            await expect(
                page.getByRole('button', { name: label('common.retry') }),
            ).toHaveCount(0)

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-08 — Remove member (only when members.length > 1)
    // We mock the members GET with 2 users, then assert the delete endpoint is called.
    test('SH-08 remove member button calls delete endpoint when members > 1', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH08 ${Date.now()}` })
        try {
            const user1 = mockUser(8005, 'Member One SH08')
            const user2 = mockUser(8006, 'Member Two SH08')

            // Mock wallet users with 2 members so isAllowedToRemove=true
            await routeJson(page, `**/api/wallets/${w.id}/users`, [user1, user2])
            await routeJson(page, '**/api/users/find/by-common-wallets', [])

            // Track the DELETE /api/wallets/{id}/users/{userId} call
            let deleteCalledUserId: string | null = null
            await page.route(`**/api/wallets/${w.id}/users/**`, route => {
                if (route.request().method() === 'DELETE') {
                    const url = route.request().url()
                    const parts = url.split('/')
                    deleteCalledUserId = parts[parts.length - 1]
                    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
                }
                return route.continue()
            })

            await page.goto(`/wallets/${w.id}/share`)

            // Both member names should be visible
            await expect(page.getByText('Member One SH08').first()).toBeVisible({ timeout: 10000 })
            await expect(page.getByText('Member Two SH08').first()).toBeVisible()

            // Remove button appears for each member (isAllowedToRemove=true since count > 1)
            // The button aria-label = 'Stop sharing wallet {walletName} for this user'
            const removeButtons = page.getByRole('button', {
                name: new RegExp(w.name, 'i'),
            })
            await expect(removeButtons.first()).toBeVisible({ timeout: 3000 })

            // Intercept the DELETE call before clicking
            const deleteReq = page.waitForRequest(
                req => req.url().includes(`/api/wallets/${w.id}/users/`) && req.method() === 'DELETE',
                { timeout: 5000 },
            )

            // Click the first remove button
            await removeButtons.first().click()

            await deleteReq
            expect(deleteCalledUserId).toBeTruthy()

            // Member One should disappear from the list
            await expect(
                page.getByText('Member One SH08').first(),
            ).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // SH-09 — Back/close button navigates to /wallets/{id}
    test('SH-09 @smoke back button navigates to wallet detail', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E SH09 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}/share`)

            // shareTitle should show wallet name
            await expect(shareTitle(page)).toContainText(w.name, { timeout: 10000 })

            // Click the X / back button (aria-label = wallets.shareBack)
            await expect(backBtn(page)).toBeVisible({ timeout: 3000 })
            await backBtn(page).click()

            // Should navigate to /wallets/{id}
            await page.waitForURL(new RegExp(`/wallets/${w.id}$`), { timeout: 10000 })
            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

})
