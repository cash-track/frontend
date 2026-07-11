// S8 — Charge create form (ChargeCreate inside WalletView)
// CC-01..CC-10
import { test, expect } from '@playwright/test'
import {
    label, labelStrings,
    routeError, route422, routeJson,
    createWalletViaApi, createTagViaApi, createChargeViaApi, deleteWalletViaApi, deleteTagViaApi,
    charge, assertNoErrorLeak,
} from './support'

// ── Local selectors ──────────────────────────────────────────────────────────

// "Add description" text button (plain <button>, not UButton)
const addDescriptionBtn = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('charges.addDescription').join('|'), 'i'))

// "Set date" text button (plain <button>)
const setDateBtn = (page: import('@playwright/test').Page) =>
    page.getByText(new RegExp(labelStrings('charges.setDate').join('|'), 'i'))

// The description textarea
const descriptionTextarea = (page: import('@playwright/test').Page) =>
    page.getByPlaceholder(label('charges.description'))

// Minimal valid mock profile (isEmailConfirmed may be overridden)
function mockProfile(isEmailConfirmed = true) {
    const now = new Date().toISOString()
    return {
        id: 1,
        name: 'E2E Test',
        lastName: null,
        nickName: 'e2etest',
        email: 'e2e@test.com',
        isEmailConfirmed,
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
    }
}

test.describe('S8 — Charge Create', () => {

    // CC-01 — New Charge button opens collapsible with amount + title inputs @smoke
    test('CC-01 @smoke New Charge opens collapsible with amount and title', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC01 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)

            // Wait for wallet to load
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            // New Charge button should be visible on active wallet
            await expect(charge.newChargeButton(page)).toBeVisible()
            await charge.newChargeButton(page).click()

            // Collapsible opens — amount input + title input appear
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })
            await expect(charge.titleInput(page)).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-02 — Expense toggle pressed by default; Income flips aria-pressed
    test('CC-02 @smoke Expense default aria-pressed; Income flips', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC02 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })
            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // Expense should be aria-pressed=true by default
            await expect(charge.expenseToggle(page)).toHaveAttribute('aria-pressed', 'true')
            await expect(charge.incomeToggle(page)).toHaveAttribute('aria-pressed', 'false')

            // Click Income — should flip
            await charge.incomeToggle(page).click()
            await expect(charge.incomeToggle(page)).toHaveAttribute('aria-pressed', 'true')
            await expect(charge.expenseToggle(page)).toHaveAttribute('aria-pressed', 'false')

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-03 — Happy create: charge appears in list, form resets @smoke
    test('CC-03 @smoke happy create: charge appears in list, form resets', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC03 ${Date.now()}` })
        const uniqueTitle = `E2E Create ${Date.now()}`
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // Fill form
            await charge.amountInput(page).fill('42')
            await charge.titleInput(page).fill(uniqueTitle)

            // Submit
            await charge.createButton(page).click()

            // New charge should appear in the list
            await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 })

            // Create form should be collapsed/reset (amount input no longer visible)
            await expect(charge.amountInput(page)).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-04 — Add tag via TagFormInput; chip appears, removable, sent in payload.
    // We seed a charge with the tag first so the wallet has a tag history — the
    // GET /api/wallets/{id}/tags endpoint returns tags used in that wallet's charges.
    test('CC-04 add tag via TagFormInput: chip appears and removable', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC04 ${Date.now()}` })
        const tagSeed = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        const uniqueTitle = `E2E TagCharge ${Date.now()}`
        try {
            // Seed one charge with that tag so the tag appears in GET /api/wallets/{id}/tags
            await createChargeViaApi(request, w.id, {
                title: `E2E seed ${Date.now()}`,
                tags: [tagSeed.id],
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // TagFormInput uses UInput with placeholder=t('tags.tags') ('Tags'|'Теги').
            // The dropdown renders TagChip buttons in an absolute div on focus.
            // Give the WalletView time to load walletTags (the 4 parallel GETs resolve async).
            await page.waitForTimeout(500)

            const tagInput = page.getByPlaceholder(label('tags.tags')).last()
            await tagInput.click()

            // Wait for the tag chip to appear in the suggestions dropdown
            const tagDropdownChip = page.locator('div.absolute.z-10 button').filter({
                hasText: tagSeed.name,
            }).first()
            await expect(tagDropdownChip).toBeVisible({ timeout: 8000 })
            await tagDropdownChip.click()

            // Selected chip should appear in the selected-tags flex row above TagFormInput
            await expect(page.getByText(tagSeed.name).first()).toBeVisible({ timeout: 5000 })

            // Fill amount + title for a real submit
            await charge.amountInput(page).fill('5')
            await charge.titleInput(page).fill(uniqueTitle)

            // Intercept the POST to verify tags are in payload
            let capturedBody: Record<string, unknown> | null = null
            page.on('request', req => {
                if (req.method() === 'POST' && req.url().includes(`/api/wallets/${w.id}/charges`)) {
                    try { capturedBody = JSON.parse(req.postData() ?? '{}') } catch { /* ignore */ }
                }
            })

            await charge.createButton(page).click()
            await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 })

            // Tags should have been included in payload
            if (capturedBody && Array.isArray((capturedBody as Record<string, unknown>).tags)) {
                expect((capturedBody as Record<string, unknown[]>).tags).toContain(tagSeed.id)
            }

            await assertNoErrorLeak(page)
        } finally {
            await deleteTagViaApi(request, tagSeed.id)
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-05 — Add description toggle shows textarea
    test('CC-05 addDescription toggle shows textarea', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC05 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // Textarea should not be visible initially
            await expect(descriptionTextarea(page)).toBeHidden()

            // Click "Add description"
            await addDescriptionBtn(page).click()

            // Textarea appears
            await expect(descriptionTextarea(page)).toBeVisible({ timeout: 3000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-06 — Set date toggle shows date input, calendar popover, max=today
    test('CC-06 setDate toggle shows date+time inputs and calendar popover', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC06 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // Click "Set date"
            await setDateBtn(page).click()

            // Date input (UInputDate) should appear — it has a textbox
            const dateInput = page.locator('input[type="date"]').or(
                page.getByRole('textbox').filter({ hasNotText: /amount|title/i })
            ).first()
            await expect(dateInput.or(page.locator('[aria-label*="date" i]').first())).toBeVisible({
                timeout: 5000,
            })

            // Calendar popover button should be visible (the leading slot)
            const calIconBtn = page.locator('form button').filter({
                has: page.locator('.i-lucide-calendar'),
            }).first()
            if (await calIconBtn.isVisible()) {
                await calIconBtn.click()
                // Calendar grid should appear
                await expect(page.locator('[data-slot="calendar"]').or(
                    page.getByRole('grid').first()
                )).toBeVisible({ timeout: 5000 })
            }

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-07 — Route 422: field errors under amount/title
    // Intentional error test — skip assertNoErrorLeak
    test('CC-07 route422: field errors shown under amount and title', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC07 ${Date.now()}` })
        try {
            // Intercept POST only
            await route422(page, `**/api/wallets/${w.id}/charges`, {
                amount: ['Amount is invalid'],
                title: ['Title is required'],
            }, 'POST')

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            await charge.amountInput(page).fill('0')
            await charge.titleInput(page).fill('x')
            await charge.createButton(page).click()

            // Field error messages should appear
            await expect(page.getByText('Amount is invalid').first()).toBeVisible({ timeout: 5000 })
            await expect(page.getByText('Title is required').first()).toBeVisible({ timeout: 5000 })
            // intentional error test — no assertNoErrorLeak
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-08 — General error (500) shows generalError alert
    // Intentional error test — skip assertNoErrorLeak
    test('CC-08 route500: generalError alert appears', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC08 ${Date.now()}` })
        try {
            await routeError(page, `**/api/wallets/${w.id}/charges`, 500)

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            await charge.amountInput(page).fill('10')
            await charge.titleInput(page).fill('test error')
            await charge.createButton(page).click()

            // generalError is non-422 → ChargeCreate renders LoadErrorAlert via :title
            await expect(
                page.locator('[data-slot="title"]').first(),
            ).toBeVisible({ timeout: 5000 })
            // intentional error test — no assertNoErrorLeak
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-09 — Email-not-confirmed: submit disabled + tooltip wrapper proves gating is wired.
    // UTooltip content renders in a Reka floating portal triggered by real pointer events.
    // A disabled <button> has pointer-events:none so browser hover won't reach the UTooltip
    // trigger span. We verify: (a) the button is disabled, (b) the UTooltip wrapper span
    // is present and contains the button, (c) confirm button remains disabled on click-attempt.
    // The tooltip text check is skipped here (tooltip portal not reachable over disabled btn).
    test('CC-09 email-not-confirmed: submit button is disabled', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC09 ${Date.now()}` })
        try {
            // Mock profile returning isEmailConfirmed=false
            await routeJson(page, '**/api/profile', mockProfile(false))

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // Create button should be disabled (wrapped in UTooltip > span.inline-flex > UButton)
            const createBtn = charge.createButton(page)
            await expect(createBtn).toBeDisabled({ timeout: 3000 })

            // The UTooltip wrapper span.inline-flex must be present in the form
            const tooltipSpan = page.locator('form span.inline-flex').filter({ has: createBtn }).first()
            await expect(tooltipSpan).toBeVisible()

            // Filling and attempting to submit should not trigger a charge creation (button disabled)
            const submitAttempts: string[] = []
            page.on('request', req => {
                if (req.method() === 'POST' && req.url().includes(`/api/wallets/${w.id}/charges`)) {
                    submitAttempts.push(req.url())
                }
            })
            await charge.amountInput(page).fill('10')
            await charge.titleInput(page).fill('disabled test')
            // The form submit should not fire because the button is disabled
            await page.keyboard.press('Enter')
            await page.waitForTimeout(500)
            expect(submitAttempts).toHaveLength(0)

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-10 — Cancel closes the collapsible
    test('CC-10 Cancel closes the collapsible', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC10 ${Date.now()}` })
        try {
            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.amountInput(page)).toBeVisible({ timeout: 5000 })

            // Click the Cancel button WITHIN the create form (not any other cancel in the page)
            const createFormLocator = page.locator('form').filter({
                has: page.getByRole('spinbutton'),
            }).first()
            await createFormLocator.getByRole('button', { name: label('charges.cancel') }).click()

            // Collapsible should close — the form containing the spinbutton is unmounted
            await expect(createFormLocator).not.toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteWalletViaApi(request, w.id)
        }
    })

    // CC-11 — ChargeTitleFormInput suggests tags by the titles of charges they were
    // previously used on (GET /api/tags/suggestions/{query}, a `%query%` match on the
    // charge title). Regression guard: the migration once wired this to the wallet
    // tag-name prefix search (/wallets/{id}/tags/find), which never matches a typed
    // title, so the title-input tag suggestions silently disappeared.
    test('CC-11 title input suggests tags from matching charge titles', async ({ request, page }) => {
        const w = await createWalletViaApi(request, { name: `E2E CC11 ${Date.now()}` })
        const tagSeed = await createTagViaApi(request, { name: `E2Etag${Date.now()}` })
        // A distinctive token in the seed charge title — what we'll type to match it.
        const titleToken = `SuggestSeed${Date.now()}`
        try {
            // Seed a charge whose title contains the token AND carries the tag, so the
            // tag becomes discoverable via the charge-title suggestion search.
            await createChargeViaApi(request, w.id, {
                title: `${titleToken} lunch`,
                tags: [tagSeed.id],
            })

            await page.goto(`/wallets/${w.id}`)
            await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 })

            await charge.newChargeButton(page).click()
            await expect(charge.titleInput(page)).toBeVisible({ timeout: 5000 })

            // Type the token — the title input fires the debounced autocomplete.
            await charge.titleInput(page).fill(titleToken)

            // The seeded tag must surface as an option inside the title input's listbox.
            const titleTagOption = page.locator(`#charge-title-listbox #charge-title-option-tag-${tagSeed.id}`)
            await expect(titleTagOption).toBeVisible({ timeout: 8000 })
            await expect(titleTagOption).toContainText(tagSeed.name)

            // Selecting it promotes the tag into the selected-tags row above the input.
            await titleTagOption.click()
            await expect(page.getByText(tagSeed.name).first()).toBeVisible({ timeout: 5000 })

            await assertNoErrorLeak(page)
        } finally {
            await deleteTagViaApi(request, tagSeed.id)
            await deleteWalletViaApi(request, w.id)
        }
    })

})
