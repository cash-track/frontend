import { test, expect } from '@playwright/test'

const TAG_NAME = `e2eTag${Date.now()}`

test.describe('Tags CRUD', () => {
    test('tags list page loads', async ({ page }) => {
        await page.goto('/tags')

        // Tags heading visible
        await expect(page.locator('body')).toContainText(/tags|теги/i)
        await expect(page.locator('body')).not.toContainText('Unknown error')
    })

    test('creates a tag', async ({ page }) => {
        await page.goto('/tags')

        // Open create tag form — click "Add New" button
        const addBtn = page.getByText(/add new|додати новий/i).first()
        await addBtn.waitFor({ state: 'visible', timeout: 10000 })

        // Fill the tag name input
        const tagInput = page.locator('input[type="text"]').first()
        await tagInput.fill(TAG_NAME)

        // Submit
        const createBtn = page.getByRole('button', { name: /create|створити/i }).first()
        await createBtn.click()

        // New tag should appear in the list
        await expect(page.getByText(TAG_NAME)).toBeVisible({ timeout: 10000 })
    })

    test('navigates to tag detail page', async ({ page }) => {
        await page.goto('/tags')

        // Click on a tag chip
        const firstTagChip = page.locator('button[class*="rounded-full"]').first()
        await firstTagChip.waitFor({ state: 'visible', timeout: 10000 })
        await firstTagChip.click()

        await expect(page).toHaveURL(/\/tags\/\d+/)
        await expect(page.locator('body')).not.toContainText('Unknown error')
    })
})

test.describe('Navigation', () => {
    test('all main nav routes work', async ({ page }) => {
        await page.goto('/wallets')
        await expect(page).toHaveURL(/\/wallets/)

        await page.goto('/tags')
        await expect(page).toHaveURL(/\/tags/)

        await page.goto('/profile')
        await expect(page).toHaveURL(/\/profile/)

        await page.goto('/settings')
        await expect(page).toHaveURL(/\/settings\/profile/)
    })

    test('root redirects to /wallets', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveURL(/\/wallets/)
    })
})
