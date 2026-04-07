import { test, expect } from '@playwright/test'

const WALLET_NAME = `E2E Wallet ${Date.now()}`
const CHARGE_TITLE = `E2E Charge ${Date.now()}`

test.describe('Wallets flow', () => {
    test('navigates to wallets page', async ({ page }) => {
        await page.goto('/wallets')
        await expect(page).toHaveURL(/\/wallets/)
        await expect(page.getByRole('heading', { name: /wallets/i })).toBeVisible({ timeout: 10000 })
    })

    test('creates a wallet', async ({ page }) => {
        await page.goto('/wallets/create')
        await page.waitForLoadState('networkidle')

        // Fill wallet name — UForm uses textbox role
        await page.getByRole('textbox', { name: /name/i }).fill(WALLET_NAME)

        // "Create" button becomes enabled after filling required fields
        await expect(page.getByRole('button', { name: /create/i })).toBeEnabled({ timeout: 5000 })
        await page.getByRole('button', { name: /create/i }).click()

        // Should redirect to wallet detail page
        await expect(page).toHaveURL(/\/wallets\/\d+/, { timeout: 15000 })
    })

    test('adds a charge to a wallet', async ({ page }) => {
        await page.goto('/wallets')
        await page.waitForLoadState('networkidle')

        // Wallet cards have h3 headings — click the first one (click bubbles to card div)
        const firstWalletHeading = page.getByRole('heading', { level: 3 }).first()
        await firstWalletHeading.waitFor({ state: 'visible', timeout: 10000 })
        await firstWalletHeading.click()

        await expect(page).toHaveURL(/\/wallets\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')

        // Open charge create form
        const newChargeBtn = page.getByRole('button', { name: /new charge|add charge|нова операція|додати/i })
        await newChargeBtn.waitFor({ state: 'visible', timeout: 10000 })
        await newChargeBtn.click()

        // Fill amount — decimal/number input
        const amountInput = page.getByRole('spinbutton').first()
        await amountInput.waitFor({ state: 'visible', timeout: 5000 })
        await amountInput.fill('10.00')

        // Fill title
        await page.getByRole('textbox', { name: /title/i }).fill(CHARGE_TITLE)

        // Submit — look for "Create" button in the form
        await page.getByRole('button', { name: /^create$/i }).click()

        // Charge should appear in the list
        await expect(page.getByText(CHARGE_TITLE)).toBeVisible({ timeout: 15000 })
    })

    test('wallet detail page shows charges list', async ({ page }) => {
        await page.goto('/wallets')
        await page.waitForLoadState('networkidle')

        const firstWalletHeading = page.getByRole('heading', { level: 3 }).first()
        await firstWalletHeading.waitFor({ state: 'visible', timeout: 10000 })
        await firstWalletHeading.click()

        await expect(page).toHaveURL(/\/wallets\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')

        await expect(page.locator('body')).not.toContainText('Unknown error')
        await expect(page.locator('body')).not.toContainText('Unable to load your wallet')
    })
})
