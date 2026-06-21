// Bilingual accessible-name matchers for vue-i18n key paths.
//
// The test account may be in English OR Ukrainian, so specs must never assert a
// bare translated string. These helpers read BOTH message files (the same ones
// the app ships) and build a case-insensitive regex matching either locale, so
// a selector works regardless of the active language. Because we import the real
// message objects, the matchers stay in sync automatically — no hardcoded copy.
//
// Usage:
//   page.getByRole('link', { name: label('wallets.wallets') })       // Wallets|Гаманці
//   page.getByRole('textbox', { name: labelExact('profileSettings.name') }) // ^Name|Ім.я\*?$
import en from '../../src/lang/messages/en'
import uk from '../../src/lang/messages/uk'

type Messages = Record<string, unknown>

function resolve(obj: Messages, keyPath: string): string | undefined {
    const value = keyPath.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object') {
            return (acc as Messages)[key]
        }
        return undefined
    }, obj)
    return typeof value === 'string' ? value : undefined
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function strings(keyPath: string): string[] {
    const parts = [resolve(en as Messages, keyPath), resolve(uk as Messages, keyPath)].filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
    )
    if (parts.length === 0) {
        throw new Error(`i18n: no string found for key path "${keyPath}" in en.ts / uk.ts`)
    }
    return parts
}

/**
 * Case-insensitive regex matching the EN or UK translation as a substring.
 * Use for accessible names that may carry extra decoration (icons, counts).
 */
export function label(keyPath: string): RegExp {
    return new RegExp(strings(keyPath).map(escapeRegExp).join('|'), 'i')
}

/**
 * Anchored variant — matches the whole accessible name (either locale), tolerating
 * a trailing required-field asterisk (e.g. rendered "Name*" for i18n "Name").
 */
export function labelExact(keyPath: string): RegExp {
    return new RegExp(`^(${strings(keyPath).map(escapeRegExp).join('|')})\\*?$`, 'i')
}

/** Raw EN/UK strings for a key path, e.g. for `toContainText` style assertions. */
export function labelStrings(keyPath: string): string[] {
    return strings(keyPath)
}
