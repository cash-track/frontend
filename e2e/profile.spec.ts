import { test, expect } from '@playwright/test'

test.describe('Profile page', () => {
    test('profile page renders all sections', async ({ page }) => {
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')

        // The profile page shows the user's name as a heading and Common Tags section
        await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 10000 })
        // No errors
        await expect(page.locator('body')).not.toContainText('Unknown error')
        await expect(page.locator('body')).not.toContainText('Unable to load')
    })

    test('stats counters show data', async ({ page }) => {
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')

        // Stats section should render (Counters)
        await expect(page.getByText(/counters|лічильники/i).first()).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Settings — profile', () => {
    test('navigates to profile settings and form is visible', async ({ page }) => {
        await page.goto('/settings')
        await expect(page).toHaveURL(/\/settings\/profile/, { timeout: 10000 })

        // Name input is visible
        await expect(page.getByRole('textbox', { name: /name/i }).first()).toBeVisible({ timeout: 10000 })
    })

    test('changes display name and saves', async ({ page }) => {
        await page.goto('/settings/profile')
        await page.waitForLoadState('networkidle')

        const nameInput = page.getByRole('textbox', { name: /^name/i })
        await nameInput.waitFor({ state: 'visible' })

        const originalName = await nameInput.inputValue()
        const newName = 'E2E ' + Date.now()

        await nameInput.fill(newName)
        await nameInput.press('Tab') // blur triggers reactive update

        // Save button must not be disabled (name + nickName both filled)
        const saveBtn = page.getByRole('button', { name: /^save$/i }).first()
        await expect(saveBtn).toBeEnabled({ timeout: 5000 })

        // Click save and verify API call succeeds
        const responsePromise = page.waitForResponse(
            r => r.url().includes('/api/profile') && r.request().method() === 'PUT',
            { timeout: 10000 },
        )
        await saveBtn.click()
        const response = await responsePromise
        expect(response.ok()).toBe(true)

        // Restore original name
        await nameInput.fill(originalName)
        await nameInput.press('Tab')
        await page.getByRole('button', { name: /^save$/i }).first().click()
    })

    test('locale combobox is present in settings', async ({ page }) => {
        await page.goto('/settings/profile')
        await page.waitForLoadState('networkidle')

        // Language combobox exists in the profile settings form
        await expect(page.getByRole('combobox', { name: /language|мова/i })).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Settings — security', () => {
    test('security page renders password form and passkeys section', async ({ page }) => {
        await page.goto('/settings/security')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('textbox', { name: /current password/i })).toBeVisible({ timeout: 10000 })
        await expect(page.locator('body')).toContainText(/passkey|ключ доступу/i)
    })
})
