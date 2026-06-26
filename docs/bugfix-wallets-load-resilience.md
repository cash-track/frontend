# Bug-fix plan: resilient wallet list loading

## Background

A user reported the error **"Помилка під час завантаження гаманців. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше."** on `my.cash-track.app/wallets` (mobile, LTE).

Investigation of the production stack for the incident window found **no server-side fault**: host healthy, `api`/`gateway`/`traefik` up, 24h of logs show **zero `/wallets/unarchived` 5xx** and **33/33 `/auth/refresh` = 200**. The request that backs the page (`GET /api/wallets/unarchived`) failed at the **client/network layer** (timeout / connection drop on flaky LTE) and never reached the origin.

The frontend has no resilience for this:

- `src/api/client.ts` creates the axios instance with **no `timeout`** → a stalled mobile request can hang indefinitely.
- A transport failure produces an `AxiosError` with **`error.response === undefined`**, so the interceptor's 401/417 branch (`client.ts:22`, gated on `error.response`) is skipped and the error propagates.
- `src/stores/wallets.ts:16` swallows it in a bare `catch {}` → `failed = true` → a generic alert **with no retry and no diagnostic info**.

## Scope

| # | Fix | Files |
|---|---|---|
| 1 | Add a request `timeout` to the axios instance | `src/api/client.ts` |
| 2 | Bounded retry + backoff for idempotent (GET/HEAD/OPTIONS) requests on **transport** errors only | `src/api/client.ts` |
| 3 | "Show Details" button next to "Try Again" that renders technical error details locally (no remote tracking) | `src/stores/wallets.ts`, the 3 list components, `src/shared/errors.ts` (new), i18n |
| 4 | "Try Again" action on the error alert that re-runs the load | the 3 list components, `src/stores/wallets.ts` |

### Out of scope

- **Remote error tracking (Sentry/etc.).** No ingestion API exists today; deliberately deferred. Fix 3 surfaces details *in the UI* instead so a user can copy them into a report.
- **Gateway `WriteCookie` cookie-clobber bug** (`gateway/service/api/forward.go:145` + `headers/cookie/auth.go:38`). Real but unrelated to this incident; track separately in `cash-track/gateway`.

## Affected error sites (must stay consistent)

The swallow-and-show-`listLoadingError` pattern appears in three components, each with its own loader:

| Component | Loader | State owner |
|---|---|---|
| `src/components/wallets/WalletsActiveGridList.vue` | `walletsStore.loadActive()` → `getUnarchived()` | Pinia store `stores/wallets.ts` |
| `src/components/wallets/WalletsGridList.vue` (archived tab) | local `onMounted` → `getArchived()` | component-local refs |
| `src/components/profile/LatestWallets.vue` | local loader → `getUnarchived()` | component-local refs |

All three get the "Try Again" + "Show Details" treatment so behaviour is uniform across the wallets surface.

---

## Fix 1 — Request timeout

**Problem.** `axios.create({ baseURL, withCredentials: true })` has no `timeout`, so a hung request never rejects on its own; the user is left on the skeleton/loading state until they navigate away.

**Change** (`src/api/client.ts`):

```ts
// Per-attempt cap. Kept below the worst-case (attempts × timeout + backoff) so a
// failing request resolves to an error in a predictable, bounded time on mobile.
export const REQUEST_TIMEOUT_MS = 15_000

export function createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
        baseURL: getEnv('VITE_GATEWAY_URL'),
        withCredentials: true,
        timeout: REQUEST_TIMEOUT_MS,
    })
    // ...interceptors unchanged
}
```

**Notes / decisions**
- Hardcoded constant rather than a new runtime env var: `getEnv` returns `string` only and adding `VITE_*` plumbing (`ImportMetaEnv` typing + `entrypoint.sh`) is disproportionate for a value we don't expect to tune per environment. Revisit if ops needs it.
- An axios timeout rejects with `AxiosError` where `code === 'ECONNABORTED'` and `response === undefined` — this is exactly the shape Fix 2 treats as retryable.

---

## Fix 2 — Bounded retry with backoff (idempotent GETs, transport errors only)

**Problem.** A single transient transport failure (timeout, `ERR_NETWORK`, connection reset) becomes a hard error with no automatic recovery, even though a GET is safe to repeat.

**Design.** Add a small `withTransportRetry` wrapper used inside `apiCall`. Retry **only** when the error is a transport error (no HTTP response received) **and** the originating request method is safe. Never retry:

- responses with a status (4xx/5xx) — those are deterministic or handled elsewhere (401 → interceptor redirects; 417 → CSRF flow),
- non-idempotent methods (POST/PUT/PATCH/DELETE),
- user-cancelled requests (`code === 'ERR_CANCELED'`),
- `CsrfError`.

**Change** (`src/api/client.ts`):

```ts
export const RETRY_MAX_ATTEMPTS = 3          // 1 initial + 2 retries
const RETRY_BASE_DELAY_MS = 400
const RETRY_BACKOFF_FACTOR = 3               // 400ms, 1200ms
const SAFE_METHODS = new Set(['get', 'head', 'options'])

function isRetryableTransportError(error: unknown): boolean {
    if (!(error instanceof AxiosError)) return false
    if (error.response) return false                       // got an HTTP status → not transport
    if (error.code === 'ERR_CANCELED') return false         // user/abort cancelled
    const method = error.config?.method?.toLowerCase() ?? ''
    return SAFE_METHODS.has(method)
}

function backoffDelay(attempt: number): number {
    const base = RETRY_BASE_DELAY_MS * RETRY_BACKOFF_FACTOR ** (attempt - 1)
    return base * (0.5 + Math.random())                     // ±50% jitter
}

async function withTransportRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown
    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            if (attempt === RETRY_MAX_ATTEMPTS || !isRetryableTransportError(error)) {
                throw error
            }
            await new Promise(resolve => setTimeout(resolve, backoffDelay(attempt)))
        }
    }
    throw lastError
}
```

Wire it into `apiCall` so it wraps the existing body (CSRF logic unchanged):

```ts
export async function apiCall<T>(fn, instanceFactory = createAxiosInstance): Promise<T> {
    const instance = instanceFactory()
    return withTransportRetry(async () => {
        try {
            return await fn(instance)
        } catch (error) {
            // ...existing CSRF-retry / safe-method handling unchanged
        }
    })
}
```

**Notes / decisions / risks**
- **GET-only by design.** For GETs the CSRF block is already a no-op (it rejects safe methods at `client.ts:68-73`), so `withTransportRetry` cleanly retries just the GET. Mutating requests fall straight through (`isRetryableTransportError` returns false).
- **Worst-case latency.** `3 × 15s` timeout + `~0.4s + ~1.2s` backoff ≈ **up to ~47s** before the final error. That is long for a foreground page load. Two levers if we want it tighter: lower `REQUEST_TIMEOUT_MS` (e.g. 10s → ~32s) or drop to `RETRY_MAX_ATTEMPTS = 2`. Recommend shipping with 3/15s and tuning after observing real behaviour. **Call this out in review.**
- Retry runs *inside* `apiCall`, so every existing caller benefits with no call-site changes.
- Use real timers in code; tests use fake timers (below).

---

## Fix 3 — "Show Details" + Fix 4 — "Try Again"

These two share the same surface (the error `UAlert`) and the same prerequisite: **stop discarding the error object**.

### 3a. Capture the error instead of `catch {}`

`stores/wallets.ts` becomes:

```ts
const lastError = shallowRef<unknown>(null)

async function loadActive() {
    loading.value = true
    failed.value = false
    lastError.value = null
    try {
        activeWallets.value = await getUnarchived()
    } catch (error) {
        activeWallets.value = []
        failed.value = true
        lastError.value = error          // kept only for local display, not sent anywhere
    } finally {
        loading.value = false
    }
}

return { activeWallets, loading, failed, lastError, loadActive }
```

Apply the equivalent change to the local `catch {}` in `WalletsGridList.vue` and `LatestWallets.vue` (add a `lastError` ref + a named `load()`/`reload()` function so the loader is callable from the retry button — `WalletsGridList` currently inlines the load in `onMounted`).

### 3b. Error-description helper

New `src/shared/errors.ts` — formats an error into a short, copy-pasteable, **metadata-only** string (no response bodies, nothing sensitive):

```ts
import { AxiosError } from 'axios'

export function describeError(error: unknown): string {
    const at = new Date().toISOString()
    if (error instanceof AxiosError) {
        const parts = [
            error.response ? `HTTP ${error.response.status}` : 'No response (network/timeout)',
            error.code ? `code=${error.code}` : null,
            error.config?.method ? `${error.config.method.toUpperCase()} ${error.config.url ?? ''}`.trim() : null,
            error.message ? `msg=${error.message}` : null,
        ].filter(Boolean)
        return `${at}\n${parts.join('\n')}`
    }
    if (error instanceof Error) return `${at}\n${error.name}: ${error.message}`
    return `${at}\n${String(error)}`
}
```

Typical output for this incident:

```
2026-06-23T16:01:12.480Z
No response (network/timeout)
code=ECONNABORTED
GET /api/wallets/unarchived
msg=timeout of 15000ms exceeded
```

### 3c. Alert with both actions + collapsible details

Replace the bare error `UAlert` (e.g. `WalletsActiveGridList.vue:36-42`) with:

```vue
<template v-else-if="failed">
    <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="t('wallets.listLoadingError')"
        :actions="[
            { label: t('wallets.retry'), color: 'error', variant: 'solid', onClick: () => walletsStore.loadActive() },
            { label: showDetails ? t('wallets.hideDetails') : t('wallets.showDetails'), color: 'error', variant: 'outline', onClick: () => (showDetails = !showDetails) },
        ]"
    />
    <pre
        v-if="showDetails"
        class="mt-2 p-3 rounded-md bg-elevated text-xs whitespace-pre-wrap break-words text-muted"
    >{{ details }}</pre>
</template>
```

Script additions:

```ts
import { ref, computed } from 'vue'
import { describeError } from '@/shared/errors'

const { lastError } = storeToRefs(walletsStore)
const showDetails = ref(false)
const details = computed(() => describeError(lastError.value))
```

For `WalletsGridList.vue` / `LatestWallets.vue` use the component-local `lastError` and `reload()` instead of the store.

**Notes / decisions**
- "Try Again" calls the same loader; it already resets `failed`/`lastError`, so the UI returns to skeleton → success/error cleanly.
- "Show Details" is purely local state; nothing is transmitted. Optional nice-to-have: a small "copy" affordance on the `<pre>` so users can paste details into a support message — propose but not required for v1.
- `<pre>` renders metadata only — no tokens, no PII, no response payloads.

---

## i18n additions

Add to the `wallets` block in **both** `src/lang/messages/en.ts` and `src/lang/messages/uk.ts`:

| Key | EN | UK |
|---|---|---|
| `wallets.retry` | `Try Again` | `Спробувати ще раз` |
| `wallets.showDetails` | `Show Details` | `Показати деталі` |
| `wallets.hideDetails` | `Hide Details` | `Сховати деталі` |

(Existing `listLoadingError` copy stays.)

---

## Tests (Vitest + Vue Test Utils)

**`src/api/__tests__/client.spec.ts`**
- `timeout` is set on the created instance (assert `instance.defaults.timeout === REQUEST_TIMEOUT_MS`).
- `withTransportRetry`: retries a GET that rejects with `new AxiosError(..., 'ECONNABORTED')` (no `response`), succeeds on attempt 2; assert exactly 2 invocations. Use `vi.useFakeTimers()` + advance timers for backoff.
- Does **not** retry: a 500 response error; a POST transport error; an `ERR_CANCELED` error; a `CsrfError`. Assert single invocation.
- Stops after `RETRY_MAX_ATTEMPTS` and rethrows the last error.

**`src/shared/__tests__/errors.spec.ts`**
- `describeError` for: transport `AxiosError` (no response) → contains `No response`, `code`, method+url; HTTP `AxiosError` → contains `HTTP 500`; plain `Error`; non-error value.

**Component specs** (`WalletsActiveGridList`, `WalletsGridList`, `LatestWallets`)
- When `failed` is true, the alert shows a retry action; clicking it calls the loader again.
- "Show Details" toggles the `<pre>`; its text contains the `describeError` output.
- Per project note: `UAlert` actions/`UDropdownMenu`-style internals can be awkward to query — assert via `wrapper.text()` and direct invocation of the bound handlers / `defineExpose`d state where `findComponent` is unreliable.

Run: `npm run test:unit -- --run` and `npm run lint`.

---

## Fix 5 — Profile-bootstrap resilience (found during browser testing)

**Problem (root cause of a worse symptom).** Stopping the gateway and loading `/wallets` showed the
wallets `UAlert` flash for one frame, then the whole page hard-redirected to the marketing site. The
wallets alert is correct — the redirect comes from the **page bootstrap**, not the wallets code:

- `App.vue` `onMounted` calls `profileStore.loadProfile()` (`GET /api/profile`) on every page.
- `stores/profile.ts:loadProfile` has a blanket `catch { useAuthStore().logout() }`. `logout()`
  (`stores/auth.ts:24`) does `window.location.href = webSiteLink('/')` → hard redirect to website.
- `App.vue`'s `watch(loading)` is a second redirect path: when the load finishes with `isLogged`
  still false it also navigates to `webSiteLink('/')`.

So any **non-401** profile-load failure (gateway 5xx, transport timeout on flaky LTE) is misclassified
as "not authenticated" → session destroyed → bounced to the marketing site. This is the same
flaky-mobile class as the original incident, on a different request, and it masks the wallets alert
entirely. (Genuine **401** never reaches this `catch`: the `apiCall` interceptor at `client.ts:63`
already redirects 401 → `/login` and returns a never-resolving promise. So the `catch` only ever sees
transient/transport/5xx/parse errors — for which logout is the wrong response.)

`getProfile` already routes through `apiCall`, so it inherits Fix 1 (timeout) + Fix 2 (transport
retry) for free — the bootstrap fetch already retries before failing.

### 5a. Shared error-alert component (consolidate the now-4 sites)

With the profile error this becomes the **4th** "alert + Try Again + Show Details" site. Extract the
duplicated pattern (currently inlined in the 3 wallets components from Fix 3/4) into
`src/components/Shared/LoadErrorAlert.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { describeError } from '@/shared/errors'

const props = defineProps<{ title: string; error: unknown }>()
const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const showDetails = ref(false)
const details = computed(() => describeError(props.error))

function onRetry() {
    showDetails.value = false   // reset so a repeat failure re-collapses the details
    emit('retry')
}

defineExpose({ showDetails })   // tests assert toggle/reset via exposed state
</script>

<template>
    <div>
        <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="title"
            :actions="[
                { label: t('common.retry'), color: 'error', variant: 'solid', onClick: onRetry },
                { label: showDetails ? t('common.hideDetails') : t('common.showDetails'), color: 'error', variant: 'outline', onClick: () => (showDetails = !showDetails) },
            ]"
        />
        <pre
            v-if="showDetails"
            class="mt-2 p-3 rounded-md bg-elevated text-xs whitespace-pre-wrap break-words text-muted"
        >{{ details }}</pre>
    </div>
</template>
```

Refactor `WalletsActiveGridList.vue`, `WalletsGridList.vue`, `LatestWallets.vue` to use it:
`<LoadErrorAlert v-else-if="failed" :title="t('wallets.listLoadingError')" :error="lastError" @retry="<loader>()" />`,
dropping their local `showDetails`/`details`/`describeError` plumbing. Behaviour is identical;
existing component tests guard the refactor (update them to drive the shared component).

### 5b. Profile store — capture instead of logout

`stores/profile.ts:loadProfile` becomes (mirrors the wallets store):

```ts
const failed = shallowRef(false)
const lastError = shallowRef<unknown>(null)

async function loadProfile() {
    loading.value = true
    failed.value = false
    lastError.value = null
    try {
        setProfile(await getProfile())
    } catch (error) {
        failed.value = true        // do NOT logout — transient failure ≠ unauthenticated
        lastError.value = error
    } finally {
        loading.value = false
    }
}
```

Return `failed` + `lastError`. **Security note:** `isLogged` is only ever set true by `setProfile` →
`login()` on a *successful* load, so a failed load leaves the user unauthenticated (no half-open
state). A genuine 401 still redirects to `/login` via the interceptor — unchanged.

### 5c. App.vue — show error + retry instead of redirecting

- Remove the `watch(loading)` website-redirect block (and the now-unused `webSiteLink` import).
- Pull `failed` + `lastError` from the profile store; add `t` from `useI18n`.
- In the `UContainer`, after the `RouterView`:
  `<LoadErrorAlert v-else-if="failed" :title="t('profile.loadError')" :error="lastError" @retry="profileStore.loadProfile()" />`
- Keep `<RouterView v-if="loading || isLogged" />`. (Success → `isLogged` true → app renders; the
  only not-logged-after-load state is `failed`, which the new branch covers — no blank content.)

### 5d. i18n

- **Move** `retry` / `showDetails` / `hideDetails` from the `wallets` block to **`common`** (both
  `en.ts` and `uk.ts`), since the shared component owns them; update the wallets references. Values:
  `common.retry` = `Try Again` / `Спробувати ще раз`, `common.showDetails` = `Show Details` /
  `Показати деталі`, `common.hideDetails` = `Hide Details` / `Сховати деталі`. Keep
  `wallets.listLoadingError`. (There is an unrelated existing `retry: 'Retry'` in another block —
  leave it.)
- **Add** `profile.loadError`: EN `Unable to load your profile. Please try again.` / UK
  `Не вдалося завантажити профіль. Будь ласка, спробуйте ще раз.` Keep EN/UK key parity.

### 5e. Tests

- `src/components/Shared/__tests__/LoadErrorAlert.spec.ts` (new): renders `title`; Try Again emits
  `retry` and resets `showDetails` to false; Show Details toggles the `<pre>` and its text contains
  `describeError(error)` output (mocked-`t` asserts on `common.*` keys).
- `stores/__tests__/profile.spec.ts`: transient failure → `failed=true`, `lastError` set, `logout`
  **not** called, `isLogged` stays false; success → `login` called, `failed=false`.
- `App.vue` test: when `profileStore.failed`, renders `LoadErrorAlert` (stubbed) and its `retry`
  calls `loadProfile`; a failed load does **not** set `window.location.href`; successful load renders
  `RouterView`. Stub the heavy deps (`@nuxt/ui/locale`, `useHead`, router) per project patterns.
- Update the 3 wallets component specs for the shared-component refactor (assert via `LoadErrorAlert`
  and the `common.*` keys); keep the "failed → retry calls loader" and details-toggle coverage.

---

## Risks & trade-offs

- **Retry latency on hard-down networks** (~47s worst case) — see Fix 2 notes; tunable via timeout/attempts.
- **Retry amplification**: bounded to safe methods + transport errors only, so no double-submits and no hammering on 5xx.
- **Detail copy leakage**: mitigated by emitting metadata only — review `describeError` to ensure no body/header content is ever included.

## Rollout

1. Implement Fix 1 + 2 (`client.ts`) with unit tests.
2. Implement `shared/errors.ts` + tests.
3. Update store + 3 components + i18n, with component tests.
4. `npm run test:unit -- --run`, `npm run lint`.
5. Manual check with `agent-browser`: load `/wallets` offline / throttled (DevTools "Offline") → verify alert, "Try Again" recovers when back online, "Show Details" shows the timeout/network description.
