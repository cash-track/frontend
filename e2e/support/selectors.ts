// Reusable, bilingual selectors (the §6 cookbook as functions). Prefer these
// over re-deriving locators in each spec. Every label-based selector resolves
// EN|UK via label()/labelExact(), so it works in either account locale.
//
// Rule of thumb: role > label > test-id > CSS. Icon-only buttons carry i18n
// aria-labels (theme.theme, language, wallets.moreActions, …) — target role + label.
import type { Locator, Page } from '@playwright/test'
import { label, labelExact } from './i18n'

/** Light/Dark/System, matching the values written to `mode.value` in AppHeader.vue. */
export type ThemeChoice = 'light' | 'dark' | 'system'

// ── App shell / header (AppHeader.vue) ───────────────────────────────────--
export const shell = {
    hamburger: (page: Page): Locator => page.locator('[aria-controls="app-header-menu"]'),
    navWallets: (page: Page): Locator => page.getByRole('link', { name: label('wallets.wallets') }),
    navTags: (page: Page): Locator => page.getByRole('link', { name: label('tags.tags') }),
    navProfile: (page: Page): Locator => page.getByRole('link', { name: label('profile.profile') }),
    // Opens the Light / Dark / System theme menu (see themeMenuItem below).
    darkModeToggle: (page: Page): Locator => page.getByRole('button', { name: label('theme.theme') }),
    themeMenuItem: (page: Page, choice: ThemeChoice): Locator =>
        page.getByRole('menuitemcheckbox', { name: label(`theme.${choice}`) }),
    languageToggle: (page: Page): Locator => page.getByRole('button', { name: label('language') }),
    signOutItem: (page: Page): Locator => page.getByRole('menuitem', { name: label('signOut') }),
    settingsItem: (page: Page): Locator => page.getByRole('menuitem', { name: labelExact('settings') }),
}

// ── Shared modal / dropdown / popover (Nuxt UI portals) ──────────────────--
export const overlay = {
    dialog: (page: Page): Locator => page.getByRole('dialog'),
    confirmCancel: (page: Page): Locator =>
        page.getByRole('dialog').getByRole('button', { name: label('common.cancel') }),
    confirmDelete: (page: Page): Locator =>
        page.getByRole('dialog').getByRole('button', { name: label('common.delete') }),
}

// ── Wallets list + detail ────────────────────────────────────────────────--
export const wallet = {
    newWalletLink: (page: Page): Locator =>
        page.getByRole('link', { name: label('wallets.newWallet') }),
    activeTab: (page: Page): Locator => page.getByRole('tab', { name: label('wallets.activeTitle') }),
    archivedTab: (page: Page): Locator =>
        page.getByRole('tab', { name: label('wallets.archivedTitle') }),
    cardHeading: (page: Page): Locator => page.getByRole('heading', { level: 3 }),
    detailHeading: (page: Page): Locator => page.getByRole('heading', { level: 2 }),
    editLink: (page: Page): Locator => page.getByRole('link', { name: label('wallets.edit') }),
    moreActions: (page: Page): Locator =>
        page.getByRole('button', { name: label('wallets.moreActions') }),
    toolTags: (page: Page): Locator => page.getByRole('button', { name: labelExact('wallets.tags') }),
    toolLimits: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('wallets.limits') }),
    toolGraph: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('wallets.graph') }),
    toolFilters: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('wallets.filters') }),
    // Create / edit form
    formName: (page: Page): Locator => page.getByRole('textbox', { name: labelExact('wallets.formName') }),
    formCreate: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('wallets.create') }),
    formUpdate: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('wallets.update') }),
}

// ── Charges (ChargeCreate / ChargeItem / ChargesList) ────────────────────--
export const charge = {
    newChargeButton: (page: Page): Locator =>
        page.getByRole('button', { name: label('charges.new') }),
    expenseToggle: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('charges.expense') }),
    incomeToggle: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('charges.income') }),
    amountInput: (page: Page): Locator => page.getByRole('spinbutton').first(),
    titleInput: (page: Page): Locator => page.getByPlaceholder(label('charges.title')).first(),
    createButton: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('charges.create') }),
    retryButton: (page: Page): Locator => page.getByRole('button', { name: label('common.retry') }),
    // Row actions are hover-revealed on desktop — caller must row.hover() first.
    rowActions: (row: Locator): Locator =>
        row.getByRole('button', { name: label('wallets.moreActions') }),
    moveButton: (page: Page): Locator => page.getByRole('button', { name: label('charges.move') }),
    clearSelection: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('charges.clearSelection') }),
}

// ── Tags (TagsView / Tag.vue / TagForm) ──────────────────────────────────--
export const tag = {
    chip: (page: Page): Locator => page.locator('button[class*="rounded-full"]'),
    nameInput: (page: Page): Locator => page.getByPlaceholder(label('tags.inputLabel')),
    colorPicker: (page: Page): Locator => page.locator('input[type="color"]'),
    createButton: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('tags.create') }),
    // Popover actions (after clicking a chip)
    popoverView: (page: Page): Locator => page.getByRole('button', { name: labelExact('tags.view') }),
    popoverEdit: (page: Page): Locator => page.getByRole('button', { name: labelExact('tags.edit') }),
    popoverDelete: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('common.delete') }),
}

// ── Settings (SettingsView UTabs / ProfileSettings / SecuritySettings) ───--
export const settings = {
    profileTab: (page: Page): Locator =>
        page.getByRole('tab', { name: label('personalSettings.profile') }),
    securityTab: (page: Page): Locator =>
        page.getByRole('tab', { name: label('personalSettings.security') }),
    nameInput: (page: Page): Locator => page.getByLabel(labelExact('profileSettings.name')),
    nickNameInput: (page: Page): Locator => page.getByLabel(labelExact('profileSettings.nickName')),
    saveButton: (page: Page): Locator =>
        page.getByRole('button', { name: labelExact('profileSettings.save') }),
    languageSelect: (page: Page): Locator =>
        page.getByRole('combobox', { name: label('profileSettings.language') }),
    currentPassword: (page: Page): Locator =>
        page.getByLabel(label('securitySettings.currentPassword')),
    newPassword: (page: Page): Locator => page.getByLabel(label('securitySettings.newPassword')),
    confirmPassword: (page: Page): Locator =>
        page.getByLabel(label('securitySettings.newPasswordConfirmation')),
    updatePassword: (page: Page): Locator =>
        page.getByRole('button', { name: label('securitySettings.updatePassword') }),
}

/** Body never shows a raw/unknown error — call in every page test (§3.4). */
export async function assertNoErrorLeak(page: Page): Promise<void> {
    const { expect } = await import('@playwright/test')
    await expect(page.locator('body')).not.toContainText('Unknown error')
    await expect(page.locator('body')).not.toContainText('Невідома помилка')
}
