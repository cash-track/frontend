// S23 — Passkeys (real WebAuthn ceremonies via CDP virtual authenticator)
// Components: PasskeysSettingsCard, PasskeysSettings, PasskeyItem (SPA, /settings > Security);
//             website Login.vue (passkey login lives on the website, not the SPA).
//
// Real registration/authentication ceremonies run against a Chrome DevTools Protocol WebAuthn
// virtual authenticator (browserContext.newCDPSession(page) -> WebAuthn.enable ->
// WebAuthn.addVirtualAuthenticator). No app code is mocked or shimmed — navigator.credentials
// calls are intercepted by Chromium itself, so @simplewebauthn/browser runs its real flow.
//
// Authenticator config is driven by the API's actual ceremony options:
//   - Registration (PasskeyService::init): residentKey=required, userVerification=preferred.
//   - Login (PasskeyService::initAuth): userVerification=required, allowCredentials=[]
//     (usernameless/discoverable) — the client must find the credential by resident key alone.
// hasResidentKey + isUserVerified are therefore non-negotiable for the login ceremony to work.
//
// CRITICAL: never perform a UI logout (POST /api/auth/logout) — it revokes the shared refresh
// token stored in e2e/setup/.auth.json server-side and breaks the suite for every later run.
// context.clearCookies() is the only allowed way to become anonymous (PK-02).
import { test, expect, type Page, type BrowserContext, type CDPSession } from '@playwright/test'
import {
    label, labelStrings,
    settings, shell, assertNoErrorLeak,
    listPasskeysViaApi, deletePasskeyViaApi,
} from './support'

// ── CDP WebAuthn virtual authenticator ──────────────────────────────────────

async function addVirtualAuthenticator(context: BrowserContext, page: Page): Promise<CDPSession> {
    const client = await context.newCDPSession(page)
    await client.send('WebAuthn.enable')
    await client.send('WebAuthn.addVirtualAuthenticator', {
        options: {
            protocol: 'ctap2',
            transport: 'internal',
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true,
        },
    })
    return client
}

// ── Local selectors (mirrors settings-security.spec.ts's openSecurityTab pattern) ──

const passkeysHeading = (page: Page) =>
    page.getByText(new RegExp(labelStrings('passkeySettings.passkeys').join('|'), 'i')).first()

const passkeyNameInput = (page: Page) =>
    page.getByPlaceholder(label('passkeySettings.keyName'))

const addPasskeyButton = (page: Page) =>
    page.getByRole('button', { name: label('passkeySettings.addPasskey') })

// Reka UTabs mounts only the active panel — click the Security tab before the passkeys
// card exists in the DOM.
async function openSecurityTab(page: Page): Promise<void> {
    await page.goto('/settings')
    await expect(settings.profileTab(page)).toBeVisible({ timeout: 10000 })
    await settings.securityTab(page).click()
    await expect(passkeysHeading(page)).toBeVisible({ timeout: 10000 })
}

function uniquePasskeyName(): string {
    return `E2E Passkey ${Date.now()}-${Math.floor(Math.random() * 1e4)}`
}

// Registers a passkey through the Settings > Security UI, driving a real startRegistration()
// ceremony against the virtual authenticator, and waits for the store response. Shared by
// PK-01 (creation) and PK-02 (login setup — a fresh key is registered before logging out).
async function registerPasskeyViaUi(page: Page, name: string): Promise<void> {
    await openSecurityTab(page)
    await passkeyNameInput(page).fill(name)

    // Register the wait BEFORE the click that fires it (init + store are two separate POSTs —
    // endsWith excludes the /init leg, which is a POST to a different, longer path).
    const stored = page.waitForResponse(
        res =>
            res.url().endsWith('/api/profile/passkey') &&
            res.request().method() === 'POST' &&
            res.status() < 400,
        { timeout: 15000 },
    )
    await addPasskeyButton(page).click()
    await stored

    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
}

test.describe('S23 — Passkeys', () => {

    // PK-01 — Create a passkey via a real WebAuthn ceremony (startRegistration), then verify
    // both the UI list and the server list contain it.
    test('PK-01 create a passkey via a real WebAuthn ceremony', async ({ page, context, request }) => {
        await addVirtualAuthenticator(context, page)
        const name = uniquePasskeyName()

        try {
            await registerPasskeyViaUi(page, name)

            // Server-side verification via the `request` fixture (shares the auth cookies).
            const serverList = await listPasskeysViaApi(request)
            expect(serverList.some(pk => pk.name === name)).toBe(true)

            await assertNoErrorLeak(page)
        } finally {
            const list = await listPasskeysViaApi(request).catch(() => [])
            const created = list.find(pk => pk.name === name)
            if (created) {
                await deletePasskeyViaApi(request, created.id)
            }
        }
    })

    // PK-02 — Log in with a passkey from the website's usernameless ceremony (startAuthentication).
    // Multi-navigation (SPA settings -> website login -> back to the SPA), so give it more budget.
    //
    // Real ceremony against the live website login. Requires two fixes outside this repo:
    //   - website: @simplewebauthn/browser upgraded 9.0.1 -> 13.x, with Login.vue passing
    //     { optionsJSON: initResponse.dataDecoded } instead of the whole response wrapper.
    //     v9's startAuthentication/startRegistration UTF8-encode/decode user ids instead of
    //     base64url-decoding/encoding them, which round-trips wrong and 400s "Invalid user
    //     handle"; passing the wrong object additionally drops rpId/allowCredentials/
    //     userVerification, defaulting them instead of enforcing the server's values.
    //   - api: PasskeyService::initAuth() must not attach the `credProps` extension (valid only
    //     for registration) to login options — Chromium rejects a login .get() call carrying it
    //     with NotSupportedError.
    // If it 500s instead, citing an impossible vendor line number, the local API's RoadRunner
    // workers are serving stale bytecode — reset them with `cd api && ./rr reset`.
    test('PK-02 log in with a passkey from the website', async ({ page, context, request }) => {
        test.slow()
        await addVirtualAuthenticator(context, page)
        const name = uniquePasskeyName()

        try {
            // Register a fresh key through the SPA first — the virtual authenticator is scoped
            // to this page target and persists across the same-site navigation below
            // (my.dev-cash-track.app -> dev-cash-track.app share the dev-cash-track.app
            // registrable domain), carrying the resident credential with it.
            await registerPasskeyViaUi(page, name)

            // Become anonymous WITHOUT a UI logout (see the file header) — clearing cookies is
            // the only allowed way.
            await context.clearCookies()

            await page.goto('https://dev-cash-track.app/login')

            // Both website locales define signIn.loginWithPasskey (en.ts / uk.ts) — assert a
            // bilingual name here too, matching this suite's convention everywhere else
            // (label()/labelStrings() on the SPA side), rather than coupling to which locale
            // a direct /login navigation happens to render.
            const loginWithPasskeyButton = page.getByRole('button', {
                name: /Login with Passkey|Увійти Ключем Доступу/i,
            })
            await expect(loginWithPasskeyButton).toBeVisible({ timeout: 15000 })

            // Register the wait BEFORE the click — the login POST fires as soon as the real
            // startAuthentication() ceremony resolves.
            const loginResponse = page.waitForResponse(
                res =>
                    res.url().endsWith('/api/auth/login/passkey') &&
                    res.request().method() === 'POST' &&
                    res.status() < 400,
                { timeout: 20000 },
            )
            await loginWithPasskeyButton.click()
            await loginResponse

            // onSuccess() does window.location.href = redirectUrl -> a full navigation back to
            // the SPA origin.
            await page.waitForURL(/my\.dev-cash-track\.app/, { timeout: 20000 })
            await expect(shell.navWallets(page)).toBeVisible({ timeout: 15000 })

            await assertNoErrorLeak(page)
        } finally {
            // The `request` fixture still carries the shared .auth.json cookies — clearing the
            // page context's cookies above does not affect it.
            const list = await listPasskeysViaApi(request).catch(() => [])
            const created = list.find(pk => pk.name === name)
            if (created) {
                await deletePasskeyViaApi(request, created.id)
            }
        }
    })

})
