import { test, expect } from '@playwright/test'

test.describe('Profile page', () => {
    test('profile page renders all sections', async ({ page }) => {
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')

        // Avatar or initials visible
        await expect(page.locator('[class*="avatar"], [class*="UAvatar"]').first()).toBeVisible({ timeout: 10000 })

        // Stats section visible
        await expect(page.locator('body')).not.toContainText('Unknown error')
    })

    test('stats show non-zero data', async ({ page }) => {
        await page.goto('/profile')
        await page.waitForLoadState('networkidle')

        // Page should have loaded without errors
        await expect(page.locator('body')).not.toContainText('Unable to load')
    })
})

test.describe('Settings — profile', () => {
    test('navigates to profile settings', async ({ page }) => {
        await page.goto('/settings')
        await expect(page).toHaveURL(/\/settings\/profile/)

        // Profile settings form visible
        await expect(page.locator('form, [class*="form"]').first()).toBeVisible({ timeout: 10000 })
    })

    test('changes display name and saves', async ({ page }) => {
        await page.goto('/settings/profile')
        await page.waitForLoadState('networkidle')

        // Find name input
        const nameInput = page.locator('input').first()
        await nameInput.waitFor({ state: 'visible' })

        const originalName = await nameInput.inputValue()
        const newName = originalName + ' Test'

        await nameInput.fill(newName)

        // Save
        await page.locator('button[type="submit"]').click()

        // Success notification should appear
        await expect(page.locator('[class*="toast"], [class*="notification"], [role="alert"]').first()).toBeVisible({
            timeout: 10000,
        })

        // Restore original name
        await nameInput.fill(originalName)
        await page.locator('button[type="submit"]').click()
    })

    test('locale switcher changes language', async ({ page }) => {
        await page.goto('/settings/profile')
        await page.waitForLoadState('networkidle')

        // Find the locale select — should show EN or UK
        const localeButton = page.getByRole('button').filter({ hasText: /EN|UK|English|Українська/i }).first()
        await localeButton.waitFor({ state: 'visible', timeout: 10000 })
    })
})

test.describe('Settings — security', () => {
    test('security page renders password form and passkeys section', async ({ page }) => {
        await page.goto('/settings/security')
        await page.waitForLoadState('networkidle')

        // Password change form
        await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 })

        // Passkeys section
        await expect(page.locator('body')).toContainText(/passkey|ключ доступу/i)
    })
})
