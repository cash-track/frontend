// API seeding factories — set up preconditions fast via the gateway instead of
// clicking through the UI. They use a Playwright APIRequestContext (pass the
// test's `request` fixture, or `page.request`) which shares the auth cookies
// loaded from storageState, so calls are authenticated.
//
// All calls go to the GATEWAY (not baseURL, not the PHP API directly) and are
// prefixed with /api. Mutating calls mirror the app's CSRF flow: on a 417 they
// rotate the token via GET /csrf (cookie-jar) and retry once.
//
// Convention: name seeded entities with an `E2E ` prefix + a unique suffix so a
// periodic cleanup can find strays. Prefer create-then-delete within a test.
import type { APIRequestContext } from '@playwright/test'

const GATEWAY_URL = process.env.E2E_GATEWAY_URL ?? 'https://gateway.dev-cash-track.app'
const JSON_HEADER = 'application/json'

function uniqueSuffix(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1e4)}`
}

async function send(
    request: APIRequestContext,
    method: 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: unknown,
) {
    const url = `${GATEWAY_URL}${path}`
    const options = {
        data: data ?? {},
        headers: { 'Content-Type': JSON_HEADER },
    }
    let res = await request[method](url, options)
    if (res.status() === 417) {
        // CSRF token missing/stale — rotate then retry once (same as apiCall()).
        const csrf = await request.get(`${GATEWAY_URL}/csrf`)
        if (!csrf.ok()) {
            throw new Error(`CSRF refresh failed: ${csrf.status()} ${await csrf.text()}`)
        }
        res = await request[method](url, options)
    }
    if (!res.ok()) {
        throw new Error(`${method.toUpperCase()} ${path} -> ${res.status()}: ${await res.text()}`)
    }
    const text = await res.text()
    if (!text) {
        return undefined
    }
    const body = JSON.parse(text)
    return body?.data ?? body
}

// ── Wallets ────────────────────────────────────────────────────────────────
export interface SeededWallet {
    id: number
    name: string
}

export async function createWalletViaApi(
    request: APIRequestContext,
    opts: { name?: string; defaultCurrencyCode?: string; isPublic?: boolean } = {},
): Promise<SeededWallet> {
    const data = await send(request, 'post', '/api/wallets', {
        name: opts.name ?? `E2E Wallet ${uniqueSuffix()}`,
        defaultCurrencyCode: opts.defaultCurrencyCode ?? 'USD',
        isPublic: opts.isPublic ?? false,
    })
    return { id: data.id as number, name: data.name as string }
}

export async function deleteWalletViaApi(request: APIRequestContext, walletId: number): Promise<void> {
    await send(request, 'delete', `/api/wallets/${walletId}`)
}

export async function disableWalletViaApi(request: APIRequestContext, walletId: number): Promise<void> {
    await send(request, 'post', `/api/wallets/${walletId}/disable`)
}

export async function activateWalletViaApi(request: APIRequestContext, walletId: number): Promise<void> {
    await send(request, 'post', `/api/wallets/${walletId}/activate`)
}

export async function archiveWalletViaApi(request: APIRequestContext, walletId: number): Promise<void> {
    await send(request, 'post', `/api/wallets/${walletId}/archive`)
}

export async function unarchiveWalletViaApi(request: APIRequestContext, walletId: number): Promise<void> {
    await send(request, 'post', `/api/wallets/${walletId}/un-archive`)
}

export async function listUnarchivedWalletsViaApi(
    request: APIRequestContext,
): Promise<Array<{ id: number; name: string }>> {
    const res = await request.get(`${GATEWAY_URL}/api/wallets/unarchived`)
    if (!res.ok()) {
        throw new Error(`GET /api/wallets/unarchived -> ${res.status()}`)
    }
    const body = await res.json()
    return (body.data as Array<{ id: number; name: string }>) ?? []
}

// ── Tags ─────────────────────────────────────────────────────────────────--
export interface SeededTag {
    id: number
    name: string
}

export async function createTagViaApi(
    request: APIRequestContext,
    opts: { name?: string; color?: string; icon?: string } = {},
): Promise<SeededTag> {
    const data = await send(request, 'post', '/api/tags', {
        name: opts.name ?? `E2Etag${uniqueSuffix().replace(/-/g, '')}`,
        color: opts.color ?? '#22c55e',
        icon: opts.icon ?? null,
    })
    return { id: data.id as number, name: data.name as string }
}

export async function deleteTagViaApi(request: APIRequestContext, tagId: number): Promise<void> {
    await send(request, 'delete', `/api/tags/${tagId}`)
}

// ── Charges ──────────────────────────────────────────────────────────────--
export interface SeededCharge {
    id: string
    title: string
}

export async function createChargeViaApi(
    request: APIRequestContext,
    walletId: number,
    opts: { type?: '+' | '-'; amount?: number; title?: string; tags?: number[] | null; dateTime?: string | null } = {},
): Promise<SeededCharge> {
    const data = await send(request, 'post', `/api/wallets/${walletId}/charges`, {
        type: opts.type ?? '-',
        amount: opts.amount ?? 10,
        title: opts.title ?? `E2E Charge ${uniqueSuffix()}`,
        // The API rejects an empty tags array — send null when nothing selected.
        tags: opts.tags && opts.tags.length > 0 ? opts.tags : null,
        dateTime: opts.dateTime ?? null,
    })
    return { id: data.id as string, title: data.title as string }
}

export async function deleteChargeViaApi(
    request: APIRequestContext,
    walletId: number,
    chargeId: string,
): Promise<void> {
    await send(request, 'delete', `/api/wallets/${walletId}/charges/${chargeId}`)
}

// ── Limits ─────────────────────────────────────────────────────────────────
export interface SeededLimit {
    id: number
    amount: number
}

/**
 * Create a wallet limit. The API rejects an empty `tags` array (422) — a limit
 * must reference ≥1 tag, so seed one with createTagViaApi and pass its id.
 */
export async function createLimitViaApi(
    request: APIRequestContext,
    walletId: number,
    tagId: number,
    opts: { type?: '+' | '-'; amount?: number } = {},
): Promise<SeededLimit> {
    const data = await send(request, 'post', `/api/wallets/${walletId}/limits`, {
        type: opts.type ?? '-',
        amount: opts.amount ?? 100,
        tags: [tagId],
    })
    return { id: data.id as number, amount: data.amount as number }
}

export async function deleteLimitViaApi(
    request: APIRequestContext,
    walletId: number,
    limitId: number,
): Promise<void> {
    await send(request, 'delete', `/api/wallets/${walletId}/limits/${limitId}`)
}
