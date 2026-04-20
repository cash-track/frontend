import { test, expect } from '@playwright/test'

const WALLET_NAME = `E2E Wallet ${Date.now()}`
const CHARGE_TITLE = `E2E Charge ${Date.now()}`

test.describe('Wallets flow', () => {
    test('navigates to wallets page', async ({ page }) => {
        await page.goto('/wallets')
        await expect(page).toHaveURL(/\/wallets/)
        await expect(page.getByRole('heading', { name: /wallets|гаманці/i }).first()).toBeVisible({ timeout: 10000 })
    })

    test('creates a wallet', async ({ page }) => {
        await page.goto('/wallets/create')

        // Fill wallet name — UForm uses textbox role
        await page.getByRole('textbox', { name: /^(name|назва)\*?$/i }).fill(WALLET_NAME)

        // "Create" button becomes enabled after filling required fields
        const createWalletBtn = page.getByRole('button', { name: /^(create|створити)$/i })
        await expect(createWalletBtn).toBeEnabled({ timeout: 5000 })
        await createWalletBtn.click()

        // Should redirect to wallet detail page
        await expect(page).toHaveURL(/\/wallets\/\d+/, { timeout: 15000 })
    })

    test('adds a charge to a wallet', async ({ page }) => {
        await page.goto('/wallets')

        // Wallet cards have h3 headings — click the first one (click bubbles to card div)
        const firstWalletHeading = page.getByRole('heading', { level: 3 }).first()
        await firstWalletHeading.waitFor({ state: 'visible', timeout: 10000 })
        await firstWalletHeading.click()

        await expect(page).toHaveURL(/\/wallets\/\d+/, { timeout: 10000 })

        // Open charge create form
        const newChargeBtn = page.getByRole('button', { name: /new charge|add charge|нова операція|додати/i })
        await newChargeBtn.waitFor({ state: 'visible', timeout: 10000 })
        await newChargeBtn.click()

        // Fill amount — decimal/number input
        const amountInput = page.getByRole('spinbutton').first()
        await amountInput.waitFor({ state: 'visible', timeout: 5000 })
        await amountInput.fill('10.00')

        // Fill title (bare UInput with no label — match by placeholder)
        await page.getByPlaceholder(/title|назва/i).first().fill(CHARGE_TITLE)

        // Submit — look for "Create" button in the form
        await page.getByRole('button', { name: /^(create|створити)$/i }).click()

        // Charge should appear in the list
        await expect(page.getByText(CHARGE_TITLE)).toBeVisible({ timeout: 15000 })
    })

    test('wallet detail page shows charges list', async ({ page }) => {
        await page.goto('/wallets')

        const firstWalletHeading = page.getByRole('heading', { level: 3 }).first()
        await firstWalletHeading.waitFor({ state: 'visible', timeout: 10000 })
        await firstWalletHeading.click()

        await expect(page).toHaveURL(/\/wallets\/\d+/, { timeout: 10000 })

        await expect(page.locator('body')).not.toContainText('Unknown error')
        await expect(page.locator('body')).not.toContainText('Unable to load your wallet')
    })
})
