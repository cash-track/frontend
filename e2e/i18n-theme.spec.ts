/**
 * S22 — Locale, dark mode, document titles (cross-cutting)
 *
 * IT-01  Locale switch updates in-page UI labels
 * IT-02  Locale persists after page reload (cshtrkl cookie)
 * IT-03  Switching locale calls PUT /api/profile/locale (updateLocale)
 * IT-04  Dark mode persists after reload (localStorage)
 * IT-05  Document titles for each route (static meta.title; namedTitle is dead code — see NAV-09)
 *
 * Notes:
 * - NEVER click Sign Out (kills shared session).
 * - PUT /api/profile/locale is INTERCEPTED and not allowed to persist server-side.
 * - Client-only effects (html.dark class, cshtrkl cookie) are per-context and safe.
 * - Locale is RESTORED at test end so subsequent tests start clean.
 * - The updateLocale path is PUT /api/profile/locale (src/api/profile.ts, updateLocale()).
 * - The app detects locale from cshtrkl cookie on mount, then overrides it from
 *   GET /api/profile response (profile.store.ts sets localeChange(user.locale)).
 *   So we detect the active locale from document.documentElement.lang, not the cookie.
 */
import { test, expect } from '@playwright/test'
import {
    shell,
    createWalletViaApi,
    deleteWalletViaApi,
    assertNoErrorLeak,
} from './support'

// ── Helper: detect current app locale from html.lang ─────────────────────────
async function getAppLocale(page: Parameters<typeof shell.hamburger>[0]): Promise<'en' | 'uk'> {
    // Wait for nav to be non-empty (profile load complete → locale finalised)
    await expect(shell.navWallets(page)).not.toBeEmpty({ timeout: 5000 })
    const lang = await page.evaluate(() => document.documentElement.lang)
    return lang === 'uk' ? 'uk' : 'en'
}

// ── Helper: open language dropdown and click the target locale item ───────────
// Locale items render as role=menuitem; labels from src/lang/index.ts:
//   { code: 'en', name: '🇺🇸 English' } | { code: 'uk', name: '🇺🇦 Українська' }
async function switchLocale(
    page: Parameters<typeof shell.hamburger>[0],
    targetLocale: 'en' | 'uk',
): Promise<void> {
    const itemText = targetLocale === 'uk' ? 'Українська' : 'English'
    await shell.languageToggle(page).click()
    await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })
    await page.getByRole('menuitem').filter({ hasText: itemText }).click()
    // Wait for i18n switch to propagate (html.lang attribute update)
    await expect
        .poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 5000 })
        .toBe(targetLocale)
}
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S22 — i18n, dark mode, document titles', () => {

    // IT-01 ───────────────────────────────────────────────────────────────────
    test(
        'IT-01 @smoke locale switch updates in-page UI labels',
        async ({ page }) => {
            // Mock PUT /api/profile/locale so the switch never persists server-side.
            await page.route('**/api/profile/locale', route => {
                if (route.request().method() === 'PUT') {
                    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' })
                } else {
                    route.continue()
                }
            })

            await page.goto('/wallets')
            const currentLocale = await getAppLocale(page)
            const targetLocale = currentLocale === 'en' ? 'uk' : 'en'

            // Snapshot current nav label
            const navBefore = (await shell.navWallets(page).textContent()) ?? ''

            await switchLocale(page, targetLocale)

            // Nav labels must change
            const navAfter = shell.navWallets(page)
            await expect(navAfter).not.toHaveText(navBefore)

            // Verify EN vs UK strings — wallets nav = 'Wallets' (EN) | 'Гаманці' (UK)
            const expectedPattern = targetLocale === 'uk' ? /Гаманці/ : /Wallets/
            await expect(shell.navWallets(page)).toContainText(expectedPattern)

            // Tags and Profile labels also switch
            const tagsPattern = targetLocale === 'uk' ? /Теги/ : /Tags/
            await expect(shell.navTags(page)).toContainText(tagsPattern)

            // Restore
            await switchLocale(page, currentLocale)
            await assertNoErrorLeak(page)
        },
    )

    // IT-02 ───────────────────────────────────────────────────────────────────
    test(
        'IT-02 locale persists via cshtrkl cookie after reload',
        async ({ page }) => {
            // Mock PUT /api/profile/locale to avoid server-side persistence.
            await page.route('**/api/profile/locale', route => {
                if (route.request().method() === 'PUT') {
                    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' })
                } else {
                    route.continue()
                }
            })

            await page.goto('/wallets')
            const currentLocale = await getAppLocale(page)
            const targetLocale = currentLocale === 'en' ? 'uk' : 'en'

            // Perform the locale switch (calls localeStore.localeChange → writeLocaleCookie)
            await switchLocale(page, targetLocale)

            // Verify cshtrkl cookie was immediately written with the target locale.
            // This is the persistence mechanism: the cookie is read by loadCachedLocale()
            // on next mount BEFORE the profile API response arrives.
            const cookies = await page.context().cookies()
            const localeCookie = cookies.find(c => c.name === 'cshtrkl')
            expect(localeCookie?.value).toBe(targetLocale)

            // To verify persistence through reload without the profile API overriding
            // our locale back, we intercept GET /api/profile and modify its response.
            // We fetch the real profile BEFORE reload (while context is alive) and prepare
            // a modified body with locale=targetLocale, then serve it during reload.
            const realProfileResp = await page.request.get(
                'https://gateway.dev-cash-track.app/api/profile',
            )
            const realProfileJson = await realProfileResp.json() as Record<string, unknown>
            const modifiedData = { ...(realProfileJson.data as Record<string, unknown>), locale: targetLocale }
            const modifiedBody = JSON.stringify({ data: modifiedData })

            await page.route('**/api/profile', route => {
                if (route.request().method() !== 'GET') { route.continue(); return }
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: modifiedBody,
                })
            })

            // Reload: loadCachedLocale() reads cshtrkl cookie (targetLocale),
            // then profile load sets the same locale via localeChange(targetLocale)
            await page.reload()
            await page.waitForLoadState('domcontentloaded')

            // After reload, html.lang should settle to targetLocale (loadCachedLocale reads the
            // cshtrkl cookie on mount, then the mocked profile load confirms the same locale).
            // Poll rather than read once — the locale finalises slightly after domcontentloaded.
            await expect
                .poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 5000 })
                .toBe(targetLocale)

            await assertNoErrorLeak(page)
        },
    )

    // IT-03 ───────────────────────────────────────────────────────────────────
    test(
        'IT-03 switching locale fires PUT /api/profile/locale (updateLocale)',
        async ({ page }) => {
            // This test specifically asserts that the API call fires (IT-03 requirement).
            // AppHeader.vue watch(locale) calls updateLocale(newLocale) when isLogged.
            // The path is PUT /api/profile/locale (src/api/profile.ts line 84).
            let updateLocaleFired = false
            let capturedLocale: string | null = null

            await page.route('**/api/profile/locale', async route => {
                if (route.request().method() === 'PUT') {
                    updateLocaleFired = true
                    const body = route.request().postDataJSON() as Record<string, unknown>
                    capturedLocale = (body?.locale as string) ?? null
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ data: {} }),
                    })
                } else {
                    await route.continue()
                }
            })

            await page.goto('/wallets')
            const currentLocale = await getAppLocale(page)
            const targetLocale = currentLocale === 'en' ? 'uk' : 'en'

            await switchLocale(page, targetLocale)

            // Verify the API call fired with the correct locale value
            expect(updateLocaleFired).toBe(true)
            expect(capturedLocale).toBe(targetLocale)

            // Restore locale (PUT mock still active — safe)
            await switchLocale(page, currentLocale)

            await assertNoErrorLeak(page)
        },
    )

    // IT-04 ───────────────────────────────────────────────────────────────────
    test(
        'IT-04 @smoke dark mode toggle persists html.dark after reload',
        async ({ page }) => {
            await page.goto('/wallets')

            // Detect current mode before touching anything
            const isInitiallyDark = await page.evaluate(() =>
                document.documentElement.classList.contains('dark'),
            )

            // Toggle once → mode flips
            await shell.darkModeToggle(page).click()
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(!isInitiallyDark)

            // Reload → localStorage restores mode (VueUse colorMode). Poll: the html.dark class
            // is reapplied on mount, which can land just after domcontentloaded.
            await page.reload()
            await page.waitForLoadState('domcontentloaded')
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(!isInitiallyDark)

            // Restore original mode (per-context so harmless, but good practice)
            await shell.darkModeToggle(page).click()
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(isInitiallyDark)

            await assertNoErrorLeak(page)
        },
    )

    // IT-05 ───────────────────────────────────────────────────────────────────
    test(
        'IT-05 document.title set correctly for each route by router.beforeEach',
        async ({ page, request }) => {
            // Seed a wallet so we can visit its parameterised routes.
            // Note: the `namedTitle` feature ('{name} | Cash Track') is dead code —
            // vue-router 4.1.4+ discards params not declared in the route path
            // (logs: "Discarded invalid param(s) 'nameForTitle' when navigating").
            // So all parameterised routes always use their static meta.title.
            const seeded = await createWalletViaApi(request, {
                name: `E2E IT05 ${Date.now()}`,
            })

            try {
                const cases: { path: string; title: string }[] = [
                    { path: '/',                                  title: 'Wallets | Cash Track' },
                    { path: '/wallets',                           title: 'Wallets | Cash Track' },
                    { path: '/wallets/create',                    title: 'Create Wallet | Cash Track' },
                    { path: `/wallets/${seeded.id}`,             title: 'Wallet | Cash Track' },
                    { path: `/wallets/${seeded.id}/edit`,        title: 'Edit Wallet | Cash Track' },
                    { path: `/wallets/${seeded.id}/share`,       title: 'Share Wallet | Cash Track' },
                    { path: '/tags',                              title: 'Tags | Cash Track' },
                    { path: '/profile',                           title: 'Profile | Cash Track' },
                    { path: '/settings',                          title: 'Settings | Cash Track' },
                    { path: '/settings/profile',                  title: 'Settings | Cash Track' }, // redirect
                    { path: '/settings/security',                 title: 'Settings | Cash Track' }, // redirect
                ]

                for (const { path, title } of cases) {
                    await page.goto(path)
                    await expect(page).toHaveTitle(title, { timeout: 10000 })
                }

                await assertNoErrorLeak(page)
            } finally {
                await deleteWalletViaApi(request, seeded.id)
            }
        },
    )
})
