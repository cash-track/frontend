/**
 * S22 — Locale, dark mode, document titles (cross-cutting)
 *
 * IT-01  Locale switch updates in-page UI labels
 * IT-02  Locale persists after page reload (cshtrkl cookie)
 * IT-03  Switching locale calls PUT /api/profile/locale (updateLocale)
 * IT-04  Theme menu: selecting Light/Dark pins html.dark and persists after reload (localStorage)
 * IT-05  Document titles for each route (static meta.title; namedTitle is dead code — see NAV-09)
 * IT-06  Theme menu: selecting System follows prefers-color-scheme live and persists 'auto'
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
 * - The theme trigger (shell.darkModeToggle) opens a Light/Dark/System UDropdownMenu
 *   (AppHeader.vue) — it no longer flips the mode directly on click. Pick the target
 *   option via shell.themeMenuItem(page, choice). Its aria-label stays static
 *   ("theme.theme") regardless of the current mode — only the icon changes.
 * - In System mode the trigger renders a composite icon (resolved sun/moon + a small
 *   monitor corner badge) — 2 <svg> nodes inside the trigger vs 1 for a manual pin.
 *   IT-06 asserts this count as a cheap, stable proxy for "the badge is showing."
 */
import { test, expect } from '@playwright/test'
import {
    shell,
    label,
    createWalletViaApi,
    deleteWalletViaApi,
    assertNoErrorLeak,
} from './support'

// ── Helper: detect the current app locale ────────────────────────────────────
// We read the *store* locale via the language menu's disabled item, NOT html.lang.
// AppHeader disables the menu item whose code === the active store locale, and the
// store is settled the instant the nav appears: profile load runs setProfile(), which
// synchronously logs in (renders the nav) AND applies the account locale to the store.
// html.lang instead follows the i18n locale, which lags the store during the async
// locale import after profile load — reading it here races (it can briefly disagree
// with the menu, so switchLocale would then target the disabled current-locale item).
async function getAppLocale(page: Parameters<typeof shell.hamburger>[0]): Promise<'en' | 'uk'> {
    await expect(shell.navWallets(page)).not.toBeEmpty({ timeout: 5000 })
    await shell.languageToggle(page).click()
    await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })
    const ukDisabled = await page
        .getByRole('menuitem')
        .filter({ hasText: 'Українська' })
        .isDisabled()
    // Close the menu so the caller resumes from a clean state.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menuitem').first()).toBeHidden({ timeout: 5000 })
    return ukDisabled ? 'uk' : 'en'
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
    // Target is the non-current locale, so its item must be enabled — wait for it rather
    // than racing the brief settle window where the store locale is still being applied.
    const item = page.getByRole('menuitem').filter({ hasText: itemText })
    await expect(item).toBeEnabled({ timeout: 5000 })
    await item.click()
    // Wait for i18n switch to propagate (html.lang attribute update). Switching TO uk the
    // first time on a page does an `await import('./messages/uk')` (lang/index.ts:63) before
    // setI18nLanguage flips html.lang — Vite transforms that chunk on first request, so under
    // cold start + parallel-worker load it can take several seconds. 10s gives that margin;
    // the PUT this test asserts already fired synchronously from AppHeader's watch(locale).
    await expect
        .poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 10000 })
        .toBe(targetLocale)
}

// ── Helper: navigate and wait for the initial profile load to settle ─────────
// AppHeader (and the language toggle) render immediately — they live outside the RouterView
// loading gate — but GET /api/profile resolves a beat later, and setProfile() then runs
// localeChange(account.locale). Switching locale before that lands lets the late localeChange
// stomp the switch back to the account locale (the IT-02/IT-03 flake: cookie + html.lang revert
// to en). Register the wait BEFORE goto so we don't miss the early response (cf. wallet-limits).
async function gotoReady(page: Parameters<typeof shell.hamburger>[0], path: string): Promise<void> {
    const profileLoaded = page.waitForResponse(
        res =>
            res.url().endsWith('/api/profile') &&
            res.request().method() === 'GET' &&
            res.status() < 500,
        { timeout: 15000 },
    )
    await page.goto(path)
    await profileLoaded
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

            await gotoReady(page, '/wallets')
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

            await gotoReady(page, '/wallets')
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

            await gotoReady(page, '/wallets')
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
        'IT-04 @smoke theme menu: selecting Light/Dark pins html.dark and persists after reload',
        async ({ page }) => {
            await page.goto('/wallets')

            // Detect current mode before touching anything
            const isInitiallyDark = await page.evaluate(() =>
                document.documentElement.classList.contains('dark'),
            )
            const targetChoice: 'light' | 'dark' = isInitiallyDark ? 'light' : 'dark'

            // Open the theme menu and pin the opposite mode explicitly.
            await shell.darkModeToggle(page).click()
            await shell.themeMenuItem(page, targetChoice).click()
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(!isInitiallyDark)

            // Reload → localStorage restores the pinned mode (VueUse colorMode). Poll: the
            // html.dark class is reapplied on mount, which can land just after domcontentloaded.
            await page.reload()
            await page.waitForLoadState('domcontentloaded')
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(!isInitiallyDark)
            await expect
                .poll(
                    () => page.evaluate(() => localStorage.getItem('vueuse-color-scheme')),
                    { timeout: 5000 },
                )
                .toBe(targetChoice)

            // Restore original mode (per-context so harmless, but good practice)
            const restoreChoice: 'light' | 'dark' = isInitiallyDark ? 'dark' : 'light'
            await shell.darkModeToggle(page).click()
            await shell.themeMenuItem(page, restoreChoice).click()
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
            // 11 sequential navigations + title assertions — legitimately heavy and borderline on
            // the default 30s budget under full-suite parallel load (passes solo in ~half that).
            // Triple the budget rather than thin the route coverage.
            test.slow()
            // Seed a wallet so we can visit its parameterised routes.
            // Note: the `namedTitle` feature ('{name} | Cash Track') is dead code —
            // vue-router 4.1.4+ discards params not declared in the route path
            // (logs: "Discarded invalid param(s) 'nameForTitle' when navigating").
            // So all parameterised routes always use their static meta.title.
            const seeded = await createWalletViaApi(request, {
                name: `E2E IT05 ${Date.now()}`,
            })

            try {
                const cases: { path: string; title: RegExp }[] = [
                    { path: '/',                                  title: label('titles.wallets') },
                    { path: '/wallets',                           title: label('titles.wallets') },
                    { path: '/wallets/create',                    title: label('titles.walletCreate') },
                    { path: `/wallets/${seeded.id}`,             title: label('titles.wallet') },
                    { path: `/wallets/${seeded.id}/edit`,        title: label('titles.walletEdit') },
                    { path: `/wallets/${seeded.id}/share`,       title: label('titles.walletShare') },
                    { path: '/tags',                              title: label('titles.tags') },
                    { path: '/profile',                           title: label('titles.profile') },
                    { path: '/settings',                          title: label('titles.settings') },
                    { path: '/settings/profile',                  title: label('titles.settings') }, // redirect
                    { path: '/settings/security',                 title: label('titles.settings') }, // redirect
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

    // IT-06 ───────────────────────────────────────────────────────────────────
    test(
        'IT-06 theme menu: selecting System follows prefers-color-scheme live and persists auto',
        async ({ page }) => {
            // Pin the OS-level scheme so the assertions below are deterministic.
            await page.emulateMedia({ colorScheme: 'light' })
            await page.goto('/wallets')

            await shell.darkModeToggle(page).click()
            await shell.themeMenuItem(page, 'system').click()

            // Selecting System writes 'auto' to the VueUse colorMode storage key…
            await expect
                .poll(
                    () => page.evaluate(() => localStorage.getItem('vueuse-color-scheme')),
                    { timeout: 5000 },
                )
                .toBe('auto')
            // …and immediately follows the (emulated) device scheme.
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(false)

            // The trigger renders a composite icon in System mode: the resolved sun/moon glyph
            // plus a small monitor corner badge — 2 icon/svg nodes, vs 1 for a manual pin.
            // Cheap, stable proxy for "the badge is showing" without asserting internal classes.
            await expect
                .poll(
                    () => shell.darkModeToggle(page).locator('svg').count(),
                    { timeout: 5000 },
                )
                .toBe(2)

            // Flip the OS-level scheme without reloading — System mode must follow live.
            await page.emulateMedia({ colorScheme: 'dark' })
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(true)

            await page.emulateMedia({ colorScheme: 'light' })
            await expect
                .poll(
                    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
                    { timeout: 5000 },
                )
                .toBe(false)

            // Restore to an explicit pin (per-context so harmless, but good practice — avoids
            // leaving the page on a mode that depends on the runner's emulated scheme).
            await shell.darkModeToggle(page).click()
            await shell.themeMenuItem(page, 'light').click()
            await expect
                .poll(
                    () => page.evaluate(() => localStorage.getItem('vueuse-color-scheme')),
                    { timeout: 5000 },
                )
                .toBe('light')

            // Manual pin: back down to a single icon/svg node — no monitor badge.
            await expect
                .poll(
                    () => shell.darkModeToggle(page).locator('svg').count(),
                    { timeout: 5000 },
                )
                .toBe(1)

            await assertNoErrorLeak(page)
        },
    )
})
