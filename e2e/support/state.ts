// Deterministic UI-state injection via Playwright request interception.
//
// Real backends won't reliably produce error / loading / empty / validation
// states, so we force them with page.route(). Install these BEFORE page.goto().
// Globs are host-agnostic ('**/api/...') so they catch the gateway origin.
// The API response envelope is { "data": ... } (double-unwrapped by the app).
import type { Page, Route } from '@playwright/test'

const JSON_CT = 'application/json'

/** Force a server error (default 500) on every matching request. */
export async function routeError(
    page: Page,
    glob: string,
    status = 500,
    body = '{"message":"E2E forced error"}',
): Promise<void> {
    await page.route(glob, (route: Route) =>
        route.fulfill({ status, contentType: JSON_CT, body }),
    )
}

/** Abort matching requests — simulates a network failure / offline. */
export async function routeAbort(page: Page, glob: string): Promise<void> {
    await page.route(glob, (route: Route) => route.abort())
}

/** Return an empty data envelope ({"data":[]}) for matching GETs. */
export async function routeEmpty(page: Page, glob: string): Promise<void> {
    await page.route(glob, (route: Route) =>
        route.fulfill({ status: 200, contentType: JSON_CT, body: '{"data":[]}' }),
    )
}

/** Fulfil matching requests with 200 + a { data, ...extra } envelope. */
export async function routeJson(
    page: Page,
    glob: string,
    data: unknown,
    extra: Record<string, unknown> = {},
): Promise<void> {
    await page.route(glob, (route: Route) =>
        route.fulfill({
            status: 200,
            contentType: JSON_CT,
            body: JSON.stringify({ data, ...extra }),
        }),
    )
}

/**
 * 422 Spiral validation error. `errors` maps field -> message string OR array
 * (the app's ValidationError.from normalises both). Only the given method is
 * intercepted; other methods on the same glob pass through.
 */
export async function route422(
    page: Page,
    glob: string,
    errors: Record<string, string | string[]>,
    method = 'POST',
): Promise<void> {
    await page.route(glob, (route: Route) =>
        route.request().method() === method
            ? route.fulfill({
                  status: 422,
                  contentType: JSON_CT,
                  body: JSON.stringify({ errors }),
              })
            : route.continue(),
    )
}

/** 401 — triggers apiCall's session-expired redirect to the login page. */
export async function route401(page: Page, glob: string): Promise<void> {
    await page.route(glob, (route: Route) =>
        route.fulfill({ status: 401, contentType: JSON_CT, body: '{}' }),
    )
}

/**
 * Hold matching responses until the returned release() is called, so a
 * skeleton / spinner / loading overlay is observable. Continues to the real
 * backend once released (use routeJson semantics yourself if you also need a
 * deterministic body). Example:
 *   const release = await routeDelay(page, '**\/api\/wallets\/unarchived')
 *   await page.goto('/wallets')
 *   await expect(skeleton).toBeVisible()
 *   release()
 *   await expect(content).toBeVisible()
 */
export async function routeDelay(page: Page, glob: string): Promise<() => void> {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
        release = resolve
    })
    await page.route(glob, async (route: Route) => {
        await gate
        await route.continue()
    })
    return release
}
