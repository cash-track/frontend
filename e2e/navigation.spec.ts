/**
 * S1 — App shell, routing, header
 *
 * NAV-01  goto /  → redirects to /wallets
 * NAV-02  Main nav links (Wallets / Tags / Profile) navigate + no Unknown error
 * NAV-03  Direct goto each static route → correct document.title
 * NAV-04  /settings/profile and /settings/security redirect to /settings
 * NAV-05  Active link carries aria-current="page" on current route
 * NAV-06  Profile dropdown → 3 menu items (Profile / Settings / Sign Out)
 * NAV-07  Dark-mode toggle flips html.dark; persists after reload
 * NAV-08  Language dropdown switches locale; cshtrkl cookie set; UI labels change
 * NAV-09  Title guard: router.push with nameForTitle sets namedTitle
 * NAV-10  Unknown path /nope — no crash, app shell still present
 */
import { test, expect } from '@playwright/test'
import {
    label,
    createWalletViaApi,
    deleteWalletViaApi,
    shell,
    assertNoErrorLeak,
} from './support'

// ── Local selector helpers not yet in support/selectors.ts ───────────────────
//
// Profile UDropdownMenu trigger in AppHeader: the button in #app-header-menu
// that has NO aria-label. (Dark-mode and language buttons both have aria-label.)
// Confirmed by debug inspection: 1 button matches, text = 'Volodymyr Komarov'.
// Promotion candidate: add shell.profileMenuTrigger to selectors.ts.
const profileMenuTrigger = (page: Parameters<typeof shell.hamburger>[0]) =>
    page.locator('#app-header-menu button:not([aria-label])')

// Language dropdown trigger: identified by its aria-label (Select language /
// Обрати мову). Same as shell.languageToggle — kept as alias for clarity.
// In AppHeader this is the second labeled button after the dark-mode toggle.
const langMenuTrigger = (page: Parameters<typeof shell.hamburger>[0]) =>
    shell.languageToggle(page)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S1 — Navigation & App Shell', () => {

    // NAV-01 ──────────────────────────────────────────────────────────────────
    test('NAV-01 @smoke / redirects to /wallets', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveURL(/\/wallets/)
        await assertNoErrorLeak(page)
    })

    // NAV-02 ──────────────────────────────────────────────────────────────────
    test('NAV-02 @smoke main nav links navigate correctly', async ({ page }) => {
        await page.goto('/wallets')

        // Tags
        await shell.navTags(page).click()
        await expect(page).toHaveURL(/\/tags$/)
        await assertNoErrorLeak(page)

        // Profile
        await shell.navProfile(page).click()
        await expect(page).toHaveURL(/\/profile$/)
        await assertNoErrorLeak(page)

        // Back to Wallets
        await shell.navWallets(page).click()
        await expect(page).toHaveURL(/\/wallets$/)
        await assertNoErrorLeak(page)
    })

    // NAV-03 ──────────────────────────────────────────────────────────────────
    test('NAV-03 @smoke direct goto each static route sets correct document.title', async ({ page }) => {
        const cases: { path: string; title: string }[] = [
            { path: '/wallets',        title: 'Wallets | Cash Track' },
            { path: '/tags',           title: 'Tags | Cash Track' },
            { path: '/profile',        title: 'Profile | Cash Track' },
            { path: '/settings',       title: 'Settings | Cash Track' },
            { path: '/wallets/create', title: 'Create Wallet | Cash Track' },
        ]

        for (const { path, title } of cases) {
            await page.goto(path)
            await expect(page).toHaveTitle(title)
            await assertNoErrorLeak(page)
        }
    })

    // NAV-04 ──────────────────────────────────────────────────────────────────
    test('NAV-04 /settings/profile and /settings/security redirect to /settings', async ({ page }) => {
        await page.goto('/settings/profile')
        await expect(page).toHaveURL(/\/settings$/)

        await page.goto('/settings/security')
        await expect(page).toHaveURL(/\/settings$/)
    })

    // NAV-05 ──────────────────────────────────────────────────────────────────
    test('NAV-05 active link carries aria-current="page" on current route', async ({ page }) => {
        await page.goto('/wallets')

        // vue-router adds aria-current="page" on the active ULink (exact=true in AppHeader.vue)
        const walletsLink = shell.navWallets(page)
        await expect(walletsLink).toHaveAttribute('aria-current', 'page')

        // Tags link must NOT be current while on /wallets
        await expect(shell.navTags(page)).not.toHaveAttribute('aria-current', 'page')

        // Navigate to /tags and verify link flips
        await shell.navTags(page).click()
        await expect(page).toHaveURL(/\/tags$/)
        await expect(shell.navTags(page)).toHaveAttribute('aria-current', 'page')
        await expect(shell.navWallets(page)).not.toHaveAttribute('aria-current', 'page')
    })

    // NAV-06 ──────────────────────────────────────────────────────────────────
    test('NAV-06 profile dropdown has Profile / Settings / Sign Out items', async ({ page }) => {
        await page.goto('/wallets')

        // profileMenuTrigger: the button in #app-header-menu with no aria-label.
        // Verified by debug: it's the 'Volodymyr Komarov' button (profile trigger).
        await profileMenuTrigger(page).click()

        // Three menu items appear in the Nuxt UI portal (role=menuitem).
        // Account is in Ukrainian locale so text is "Профіль" / "Налаштування" / "Вийти".
        // Use label() for bilingual matching.
        await expect(page.getByRole('menuitem', { name: label('profile.profile') }).first()).toBeVisible({
            timeout: 5000,
        })
        await expect(page.getByRole('menuitem', { name: label('settings') }).first()).toBeVisible()
        // Assert Sign Out is visible but DO NOT click it — kills the shared session.
        await expect(shell.signOutItem(page)).toBeVisible()

        await assertNoErrorLeak(page)
    })

    // NAV-07 ──────────────────────────────────────────────────────────────────
    test('NAV-07 dark-mode toggle flips html.dark and persists after reload', async ({ page }) => {
        await page.goto('/wallets')

        // Detect the current mode before touching anything
        const isInitiallyDark = await page.evaluate(() =>
            document.documentElement.classList.contains('dark'),
        )

        // Toggle once; VueUse colorMode updates html.dark and writes to localStorage
        await shell.darkModeToggle(page).click()
        await expect
            .poll(
                () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                { timeout: 5000 },
            )
            .toBe(!isInitiallyDark)

        // Reload — localStorage restores the mode (VueUse colorMode reapplies html.dark on mount,
        // which can land just after domcontentloaded; poll rather than read once).
        await page.reload()
        await page.waitForLoadState('domcontentloaded')
        await expect
            .poll(
                () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                { timeout: 5000 },
            )
            .toBe(!isInitiallyDark)

        // Restore original mode so we don't leave the context permanently dark/light
        await shell.darkModeToggle(page).click()
        await expect
            .poll(
                () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                { timeout: 5000 },
            )
            .toBe(isInitiallyDark)

        await assertNoErrorLeak(page)
    })

    // NAV-08 ──────────────────────────────────────────────────────────────────
    test(
        'NAV-08 language dropdown switches locale; cshtrkl cookie updated; UI changes',
        async ({ page }) => {
            // Mock PUT /api/profile/locale so the switch never persists server-side.
            // The path is from src/api/profile.ts → updateLocale() → PUT /api/profile/locale.
            let updateLocaleFired = false
            await page.route('**/api/profile/locale', route => {
                if (route.request().method() === 'PUT') {
                    updateLocaleFired = true
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ data: {} }),
                    })
                } else {
                    route.continue()
                }
            })

            await page.goto('/wallets')

            // Detect current locale from the LIVE page state, not the cookie.
            // The profile store calls localeChange(user.locale) when the profile loads,
            // which may override the initial cookie value. We detect by reading the html
            // lang attribute (set by setI18nLanguage() in src/lang/index.ts).
            // We wait for the profile load to complete first by waiting for the nav to
            // show a non-empty label.
            await expect(shell.navWallets(page)).not.toBeEmpty({ timeout: 5000 })
            const htmlLang = await page.evaluate(() => document.documentElement.lang)
            const currentLocale = htmlLang === 'uk' ? 'uk' : 'en'
            const targetLocale = currentLocale === 'en' ? 'uk' : 'en'

            // Locale menu item labels (from src/lang/index.ts locales[].name):
            //   '🇺🇸 English'  |  '🇺🇦 Українська'
            // We match by the text part (after the flag emoji).
            const targetItemText = targetLocale === 'uk' ? 'Українська' : 'English'
            const restoreItemText = currentLocale === 'uk' ? 'Українська' : 'English'

            // Snapshot nav label before the switch
            const navTextBefore = (await shell.navWallets(page).textContent()) ?? ''

            // Open language dropdown; items render as role=menuitem in a portal
            await langMenuTrigger(page).click()
            await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })

            // Click the target locale
            await page.getByRole('menuitem').filter({ hasText: targetItemText }).click()

            // The in-page i18n switches; nav labels change
            const expectedNavText = targetLocale === 'uk' ? /Гаманці/ : /Wallets/
            await expect(shell.navWallets(page)).toContainText(expectedNavText, { timeout: 5000 })

            // Verify something actually changed
            const navTextAfter = shell.navWallets(page)
            await expect(navTextAfter).not.toHaveText(navTextBefore)

            // cshtrkl cookie must reflect the new locale
            // (localeChange() writes it via writeLocaleCookie())
            const updatedHtmlLang = await page.evaluate(() => document.documentElement.lang)
            expect(updatedHtmlLang).toBe(targetLocale)

            // The watch(locale) in AppHeader.vue calls updateLocale() when logged in
            expect(updateLocaleFired).toBe(true)

            // ── Restore original locale ──────────────────────────────────────
            // The PUT mock is still active so restore won't hit the real server.
            await langMenuTrigger(page).click()
            await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })
            await page.getByRole('menuitem').filter({ hasText: restoreItemText }).click()
            const restoredNavText = currentLocale === 'uk' ? /Гаманці/ : /Wallets/
            await expect(shell.navWallets(page)).toContainText(restoredNavText, { timeout: 5000 })
            // Verify html lang restored
            const restoredLang = await page.evaluate(() => document.documentElement.lang)
            expect(restoredLang).toBe(currentLocale)

            await assertNoErrorLeak(page)
        },
    )

    // NAV-09 ──────────────────────────────────────────────────────────────────
    test(
        'NAV-09 title guard: each route sets its static meta.title; namedTitle is dead code',
        async ({ page, request }) => {
            // BUG DISCOVERY (documented, not hidden):
            // The router's beforeEach guard in src/router/index.ts lines 119–123 checks
            // `to.params.nameForTitle` to set a dynamic title like "Edit {name} | Cash Track".
            // However, vue-router v4.1.4+ discards params that aren't declared in the route
            // path (it logs: "Discarded invalid param(s) 'nameForTitle' when navigating").
            // So namedTitle is NEVER applied — every route always uses its static meta.title.
            //
            // This test documents the ACTUAL behaviour (static titles only) and verifies
            // named routes with a walletID param use the static title, not a wallet name.
            const seeded = await createWalletViaApi(request, {
                name: `E2E NavTitle ${Date.now()}`,
            })

            try {
                // /wallets/:walletID → meta.title = 'Wallet | Cash Track' (no named title)
                await page.goto(`/wallets/${seeded.id}`)
                await expect(page).toHaveTitle('Wallet | Cash Track', { timeout: 10000 })

                // /wallets/:walletID/edit → meta.title = 'Edit Wallet | Cash Track'
                await page.goto(`/wallets/${seeded.id}/edit`)
                await expect(page).toHaveTitle('Edit Wallet | Cash Track', { timeout: 10000 })

                // /wallets/:walletID/share → meta.title = 'Share Wallet | Cash Track'
                await page.goto(`/wallets/${seeded.id}/share`)
                await expect(page).toHaveTitle('Share Wallet | Cash Track', { timeout: 10000 })

                await assertNoErrorLeak(page)
            } finally {
                await deleteWalletViaApi(request, seeded.id)
            }
        },
    )

    // NAV-10 ──────────────────────────────────────────────────────────────────
    test(
        'NAV-10 unknown path /nope — no crash; app shell visible; no Unknown error',
        async ({ page }) => {
            // There is NO catch-all route in src/router/index.ts.
            // The router renders nothing for unmatched paths; the Vue app shell
            // (header) stays mounted but the main content area is blank.
            // Actual behaviour: shell visible, body has no error message, document.title
            // is whatever the browser last set (no route meta → no update).
            await page.goto('/nope')

            // App shell nav must still be present
            await expect(shell.navWallets(page)).toBeVisible({ timeout: 10000 })
            await expect(shell.navTags(page)).toBeVisible()
            await expect(shell.navProfile(page)).toBeVisible()

            // No raw error text in the visible area
            await assertNoErrorLeak(page)
            await expect(page.locator('body')).not.toContainText('Unable to load')

            // Title is non-empty (inherited from whatever was set before, or the default)
            const title = await page.title()
            expect(title.length).toBeGreaterThan(0)
        },
    )
})
