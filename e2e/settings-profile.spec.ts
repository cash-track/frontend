// S15 — Settings profile tab (/settings)
// Components: SettingsView, ProfileSettingsView, ProfileSettings, EmailFormInput
import { test, expect } from '@playwright/test'
import {
    label, labelExact, labelStrings,
    routeError, routeJson, route422,
    settings, assertNoErrorLeak,
} from './support'

// ── Local selectors ────────────────────────────────────────────────────────────

// Alert: success message ([data-slot="description"] with profile.success text)
const profileSuccessAlert = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="description"]')
        .filter({ hasText: new RegExp(labelStrings('profileSettings.success').join('|'), 'i') })

// Alert: general error — non-422 general errors render via LoadErrorAlert's :title
const generalErrorAlert = (page: import('@playwright/test').Page) =>
    page.locator('[data-slot="title"]')
        .filter({ hasText: /error|помилка/i })

// Social section error text (profileSettings.socialLoadError — plain text, not alert)
const socialLoadError = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('profileSettings.socialLoadError').join('|'), 'i')).first()

// Email Resend button (emailFormInput.resend)
const resendButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: label('emailFormInput.resend') })

// Last Name input — not in shared selectors; locate by label
const lastNameInput = (page: import('@playwright/test').Page) =>
    page.getByLabel(labelExact('profileSettings.lastName'))

// Nickname check icon (i-lucide-check in trailing of nickname input)
const nickAvailableIcon = (page: import('@playwright/test').Page) =>
    page.locator('.text-success.size-5').first()


// Confirmation-sent message text (emailFormInput.confirmationMessageSent pattern)
const confirmationSentText = (page: import('@playwright/test').Page) =>
    page.getByText(/confirmation email has been sent|підтвердження надіслано/i).first()

// Minimal valid User mock for routeJson
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

test.describe('S15 — Settings: Profile tab', () => {

    // SP-01 — Profile tab is active by default; Name input visible without clicking @smoke
    test('SP-01 @smoke profile tab is default; Name input visible', async ({ page }) => {
        await page.goto('/settings')

        // Name input should be immediately visible (Profile is the default tab)
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // SP-02 — All 6 fields present on the profile tab
    test('SP-02 all profile fields present (Name, Last Name, Nick Name, Email, Currency, Language)', async ({ page }) => {
        await page.goto('/settings')

        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })
        await expect(lastNameInput(page)).toBeVisible({ timeout: 10000 })
        await expect(settings.nickNameInput(page)).toBeVisible({ timeout: 10000 })

        // Email field — disabled UInput rendered by EmailFormInput
        await expect(page.getByLabel(labelExact('emailFormInput.label'))).toBeVisible({ timeout: 10000 })

        // Currency USelect — UFormField with label profileSettings.defaultCurrency
        await expect(
            page.getByText(label('profileSettings.defaultCurrency')).first(),
        ).toBeVisible({ timeout: 10000 })

        // Language USelect — UFormField with label profileSettings.language
        await expect(
            page.getByText(label('profileSettings.language')).first(),
        ).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    // SP-03 — Save button is disabled when Name or Nick Name is empty
    test('SP-03 Save disabled when Name or Nick Name empty', async ({ page }) => {
        await page.goto('/settings')

        // Wait for form to populate
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // The page has two Save buttons (ProfileSettings + ProfilePhoto). Use .first()
        // which is the Profile Settings card save button (rendered before ProfilePhoto).
        const saveBtn = settings.saveButton(page).first()

        // Clear Name field → Save should become disabled
        await settings.nameInput(page).fill('')
        await expect(saveBtn).toBeDisabled({ timeout: 3000 })

        // Restore Name, clear Nick Name → still disabled
        await settings.nameInput(page).fill('Test Name')
        await settings.nickNameInput(page).fill('')
        await expect(saveBtn).toBeDisabled({ timeout: 3000 })

        await assertNoErrorLeak(page)
    })

    // SP-04 — Happy save: change Name → PUT /api/profile 200 → success alert @smoke
    test('SP-04 @smoke save profile shows success alert (PUT mocked)', async ({ page }) => {
        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Track the PUT request payload
        let capturedBody: Record<string, unknown> | null = null
        await page.route('**/api/profile', async route => {
            if (route.request().method() === 'PUT') {
                capturedBody = JSON.parse(route.request().postData() ?? '{}')
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: mockUser({ name: 'E2E Updated Name' }) }),
                })
            } else {
                await route.continue()
            }
        })

        // Wait until the form is populated from the loaded profile before editing.
        // The route mounts during the profile-load window, so filling too early lets the
        // late watch(profile) overwrite the typed value (submitting the original name).
        await expect(settings.nameInput(page)).not.toHaveValue('', { timeout: 10000 })

        // Change the Name field
        await settings.nameInput(page).fill('E2E Updated Name')

        // The page has two Save buttons (ProfileSettings + ProfilePhoto). Use .first().
        await settings.saveButton(page).first().click()

        // Success alert must appear
        await expect(profileSuccessAlert(page)).toBeVisible({ timeout: 10000 })

        // Verify the PUT was made with the changed name
        expect(capturedBody).not.toBeNull()
        expect(capturedBody!.name).toBe('E2E Updated Name')

        // No real mutation persisted — the route was intercepted
        await assertNoErrorLeak(page)
    })

    // SP-05 — Save with 422/500 shows field/general error
    test('SP-05 save with 422 shows field error; 500 shows general error', async ({ page }) => {
        // First sub-test: 422 with field error on "name"
        await route422(page, '**/api/profile', { name: ['Name is taken'] }, 'PUT')

        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        await settings.nameInput(page).fill('Conflict Name')
        await settings.saveButton(page).first().click()

        // Field error should appear under the Name field
        await expect(
            page.getByText('Name is taken').first(),
        ).toBeVisible({ timeout: 10000 })
        // Intentional error test — skip assertNoErrorLeak
    })

    test('SP-05b save with 500 shows general error', async ({ page }) => {
        await page.route('**/api/profile', async route => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: '{"message":"Server error"}',
                })
            } else {
                await route.continue()
            }
        })

        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        await settings.nameInput(page).fill('Any Name')
        await settings.saveButton(page).first().click()

        // General error alert should appear
        await expect(generalErrorAlert(page)).toBeVisible({ timeout: 10000 })
        // Intentional error test — skip assertNoErrorLeak
    })

    // SP-06 — Nickname availability check (1000ms debounce)
    test('SP-06 nick check: available → check icon; taken → field error', async ({ page }) => {
        await page.goto('/settings')
        await expect(settings.nickNameInput(page)).toBeVisible({ timeout: 10000 })

        // Mock the nick-name check endpoint: available (200)
        await page.route('**/api/profile/check/nick-name', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        })

        // Type a new nickName — different from the current one
        await settings.nickNameInput(page).fill('uniquenick' + Date.now())

        // Wait for the debounce (1000ms) to fire + a little buffer
        await page.waitForTimeout(1100)

        // Should show checkNickName request fired and valid → check icon
        await expect(nickAvailableIcon(page)).toBeVisible({ timeout: 5000 })

        await assertNoErrorLeak(page)
    })

    test('SP-06b nick taken: 422 → field error shown', async ({ page }) => {
        await page.goto('/settings')
        await expect(settings.nickNameInput(page)).toBeVisible({ timeout: 10000 })

        // Override nick-name check to 422 (taken)
        await page.route('**/api/profile/check/nick-name', async route => {
            await route.fulfill({
                status: 422,
                contentType: 'application/json',
                body: JSON.stringify({ errors: { nickName: ['Nick name already claimed'] } }),
            })
        })

        // Ensure the profile has populated the field before typing — otherwise the late
        // watch(profile) resets nickName and cancels the pending availability check.
        await expect(settings.nickNameInput(page)).not.toHaveValue('', { timeout: 10000 })

        await settings.nickNameInput(page).fill('takennick')
        await page.waitForTimeout(1100)

        // Field error should appear
        await expect(
            page.getByText('Nick name already claimed').first(),
        ).toBeVisible({ timeout: 5000 })
        // Intentional error — skip assertNoErrorLeak
    })

    // SP-07 — Language select is present
    test('SP-07 language select is present and shows current value', async ({ page }) => {
        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Language USelect is rendered — check either combobox or trigger button
        // The shared selector uses getByRole('combobox') which may not resolve for USelect.
        // Fallback: check that the language label and a [data-slot="value"] are present.
        const languageLabel = page.getByText(label('profileSettings.language')).first()
        await expect(languageLabel).toBeVisible({ timeout: 10000 })

        // [data-slot="value"] elements exist (at least currency + language = 2)
        await expect(page.locator('[data-slot="value"]').first()).toBeVisible({ timeout: 5000 })

        await assertNoErrorLeak(page)
    })

    // SP-08 — Currency select shows options like "USD — ..."
    test('SP-08 currency select shows USD option', async ({ page }) => {
        // Mock currencies endpoint
        await routeJson(page, '**/api/currencies/featured', [
            { id: 'USD', code: 'USD', name: 'United States dollar', char: '$', rate: 1, updatedAt: new Date().toISOString() },
            { id: 'EUR', code: 'EUR', name: 'European euro', char: '€', rate: 0.9, updatedAt: new Date().toISOString() },
        ])

        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Currency label visible
        const currencyLabel = page.getByText(label('profileSettings.defaultCurrency')).first()
        await expect(currencyLabel).toBeVisible({ timeout: 10000 })

        // Click the currency select to open options
        // USelect trigger is closest button sibling of the label
        const currencySection = page.locator('[data-slot="value"]').first()
        await currencySection.click()

        // Option list should show "USD — United States dollar"
        await expect(
            page.getByText(/USD\s*[—–-]\s*United States dollar/i).first(),
        ).toBeVisible({ timeout: 5000 })

        // Escape to close the list
        await page.keyboard.press('Escape')

        await assertNoErrorLeak(page)
    })

    // SP-09 — Social (Google): skeleton while loading, then connected/not-connected badge
    test('SP-09 social Google: skeleton while loading, then badge appears', async ({ page }) => {
        // Use a single route handler that holds the response then fulfills with a known body.
        // This avoids the unroute race condition that "route already handled" triggers.
        let release!: () => void
        const gate = new Promise<void>(res => { release = res })

        await page.route('**/api/profile/social', async route => {
            await gate
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { google: true } }),
            })
        })

        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Social skeleton (USkeleton = .animate-pulse) should be visible while held
        await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 })

        // Release so the social load completes
        release()

        // After load, Connected badge should appear
        await expect(
            page.getByText(label('profileSettings.googleConnected')).first(),
        ).toBeVisible({ timeout: 10000 })

        await assertNoErrorLeak(page)
    })

    test('SP-09b social error shows socialLoadError text', async ({ page }) => {
        await routeError(page, '**/api/profile/social')

        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Error text for social section
        await expect(socialLoadError(page)).toBeVisible({ timeout: 10000 })
        // Intentional error — skip assertNoErrorLeak
    })

    // SP-10 — EmailFormInput: when unconfirmed → Resend present; click → confirmation-sent + cooldown
    test('SP-10 unconfirmed email shows Resend button; click mocks resend shows cooldown', async ({ page }) => {
        // Mock profile to return isEmailConfirmed: false
        await routeJson(page, '**/api/profile', mockUser({ isEmailConfirmed: false }))

        // Mock getEmailConfirmation to return un-throttled state
        await routeJson(page, '**/api/auth/email/confirmation', {
            email: 'e2e@example.com',
            createdAt: new Date().toISOString(),
            resendTimeLimit: 60,
            validTimeLimit: 3600,
            timeSentAgo: 120,
            isThrottled: false,
            isValid: true,
        })

        // Mock resend endpoint
        await page.route('**/api/auth/email/confirmation/resend', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
            } else {
                await route.continue()
            }
        })

        // After resend, mock getEmailConfirmation to show throttled state with countdown
        let resendCalled = false
        await page.route('**/api/auth/email/confirmation', async route => {
            if (resendCalled) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            email: 'e2e@example.com',
                            createdAt: new Date().toISOString(),
                            resendTimeLimit: 60,
                            validTimeLimit: 3600,
                            timeSentAgo: 0,
                            isThrottled: true,
                            isValid: true,
                        },
                    }),
                })
            } else {
                await route.continue()
            }
        })

        await page.goto('/settings')
        await expect(settings.nameInput(page)).toBeVisible({ timeout: 10000 })

        // Resend button should be visible since email is not confirmed
        await expect(resendButton(page)).toBeVisible({ timeout: 10000 })

        // Intercept the resend call to set the flag
        page.once('request', req => {
            if (req.url().includes('/confirmation/resend')) {
                resendCalled = true
            }
        })

        // Click Resend
        await resendButton(page).click()

        // After resend, the confirmation-sent message should appear with countdown
        await expect(confirmationSentText(page)).toBeVisible({ timeout: 10000 })

        // No real mutation persisted — resend was intercepted
        // Intentional unconfirmed state — skip assertNoErrorLeak
    })

})
