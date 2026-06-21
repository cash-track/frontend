import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

// Use the REAL i18n instance (not a hand-rolled mock). The previous version mocked @/lang with
// a plain-object lookup that bypassed vue-i18n's message compiler, so it returned
// 'Wallets | Cash Track' verbatim and passed even while the live feature was broken — vue-i18n
// treats `|` as the plural delimiter, so t('titles.wallets') on 'Wallets | Cash Track' actually
// returns only 'Wallets'. Testing against the real instance catches that class of bug.
import i18n from '@/lang'
import ukMessages from '@/lang/messages/uk'

import { setDocumentTitle } from '../index'

// uk is lazy-loaded in the app (dynamic import), so it isn't present on the instance in tests —
// register it explicitly so locale switching resolves real Ukrainian strings.
beforeAll(() => {
    i18n.global.setLocaleMessage('uk', ukMessages as unknown as Record<string, unknown>)
})

function setLocale(locale: 'en' | 'uk') {
    // legacy: false → locale is a WritableComputedRef
    ;(i18n.global.locale as unknown as { value: string }).value = locale
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRoute(
    title: string,
    namedTitle?: string,
    nameForTitle?: string,
): RouteLocationNormalized {
    return {
        matched: [
            {
                meta: namedTitle !== undefined ? { title, namedTitle } : { title },
                // minimal required RouteRecordNormalized fields
                path: '',
                name: undefined,
                redirect: undefined,
                components: undefined,
                props: {},
                beforeEnter: undefined,
                aliasOf: undefined,
                children: [],
                instances: {},
                leaveGuards: new Set(),
                updateGuards: new Set(),
                enterCallbacks: {},
            },
        ],
        params: nameForTitle !== undefined ? { nameForTitle } : {},
        fullPath: '/',
        path: '/',
        query: {},
        hash: '',
        name: undefined,
        meta: {},
        redirectedFrom: undefined,
    } as unknown as RouteLocationNormalized
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('setDocumentTitle', () => {
    afterEach(() => {
        setLocale('en')
    })

    it('(a) sets correct EN title for plain wallets route, with brand suffix', () => {
        setLocale('en')
        setDocumentTitle(makeRoute('titles.wallets'))
        expect(document.title).toBe('Wallets | Cash Track')
    })

    it('(b) sets correct UK title for wallets route after locale switch', () => {
        setLocale('uk')
        setDocumentTitle(makeRoute('titles.wallets'))
        expect(document.title).toBe('Гаманці | Cash Track')
        // Verify it actually differs from EN — guards against the `|`-pluralization regression
        // and against UK messages not being loaded.
        expect(document.title).not.toBe('Wallets | Cash Track')
    })

    it('(c) interpolates named title for wallets.show via the {name} param', () => {
        setLocale('en')
        setDocumentTitle(makeRoute('titles.wallet', 'titles.walletNamed', 'My Wallet'))
        expect(document.title).toBe('My Wallet | Cash Track')
    })

    it('falls back to the static title when nameForTitle is absent', () => {
        setLocale('en')
        setDocumentTitle(makeRoute('titles.wallet', 'titles.walletNamed'))
        expect(document.title).toBe('Wallet | Cash Track')
    })

    it('does nothing when matched array is empty', () => {
        document.title = 'Previous Title'
        const emptyRoute = {
            matched: [],
            params: {},
            fullPath: '/',
            path: '/',
            query: {},
            hash: '',
            name: undefined,
            meta: {},
            redirectedFrom: undefined,
        } as unknown as RouteLocationNormalized
        setDocumentTitle(emptyRoute)
        expect(document.title).toBe('Previous Title')
    })
})
