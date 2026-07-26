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

// ── App shell / header (AppHeader.vue) + footer (AppFooter.vue) ──────────--
export const shell = {
    footer: (page: Page): Locator => page.locator('footer'),
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

// ── UCalendar popover (Reka Calendar, portalled) ─────────────────────────--
// Since Nuxt UI 4.5.1 the grid table renders as <table role="application"
// data-slot="grid"> — there is NO role="grid" anywhere in the DOM, so match the
// data-slot instead (structural, and stable across Reka role changes). Date cells
// still carry role="gridcell", which is why only the grid gate ever broke.
export const calendar = {
    grid: (page: Page): Locator => page.locator('[data-slot="grid"]').first(),
    // Selectable date cells: not disabled (ChargeCreate caps the calendar at today via
    // :max-value) AND not an adjacent-month padding day. The 6-week grid pads with
    // [data-outside-view] days, and clicking one both selects the date and NAVIGATES the
    // grid to that month — the re-render then races whatever the test asserts next.
    // Staying in-view keeps the click a pure selection.
    availableCells: (page: Page): Locator =>
        page.locator('td[role="gridcell"]:not([data-disabled]):not(:has([data-outside-view]))'),
    // The interactive element inside a cell — the <td> is only a wrapper, the click
    // handler lives on this div. Carries data-value="YYYY-MM-DD".
    cellTrigger: (cell: Locator): Locator => cell.locator('[data-reka-calendar-cell-trigger]'),
    // The UPopover trigger that opens a calendar. In ChargesFilter the buttons carry
    // i18n aria-labels (charges.filterInputFrom/To) — prefer those; ChargeCreate's has
    // no accessible name, so scope by form and match the popover trigger attribute.
    triggerInForm: (page: Page): Locator =>
        page.locator('form button[aria-haspopup="dialog"]').first(),
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

/**
 * Pick the first selectable day in an already-open UCalendar popover, and return its
 * `YYYY-MM-DD` value. Resolves only once Reka has marked the day selected, so callers
 * can assert on the consequences (badge, refetch) without racing the click.
 *
 * The click is retried until the selection sticks. Under full-suite load a click on the
 * portalled popover is occasionally not delivered to the cell trigger: every Playwright
 * actionability check passes, the popover stays open, and no date is set — the date-from
 * segments still read mm/dd/yyyy. It reproduces roughly one full run in three and never
 * in isolation (0/40 in a tight loop), and the badge is pure local state (`v-if="dateFrom"`
 * in ChargesFilter.vue) so no API call is involved. Selecting a day is idempotent —
 * re-clicking an already-selected day leaves it selected — so re-issuing the click is safe
 * and makes this helper's contract ("a date is picked") actually hold.
 */
export async function pickFirstAvailableDate(page: Page): Promise<string> {
    const { expect } = await import('@playwright/test')
    const cell = calendar.availableCells(page).first()

    await expect(async () => {
        await calendar.cellTrigger(cell).click()
        await expect(cell).toHaveAttribute('aria-selected', 'true', { timeout: 1000 })
    }).toPass({ timeout: 10000 })

    return (await calendar.cellTrigger(cell).getAttribute('data-value')) ?? ''
}

/** Body never shows a raw/unknown error — call in every page test (§3.4). */
export async function assertNoErrorLeak(page: Page): Promise<void> {
    const { expect } = await import('@playwright/test')
    await expect(page.locator('body')).not.toContainText('Unknown error')
    await expect(page.locator('body')).not.toContainText('Невідома помилка')
}
