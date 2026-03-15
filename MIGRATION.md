# Frontend Migration Plan: Vue 2 + Bootstrap Vue → Vue 3 + Nuxt UI

> **Self-update rule:** After completing each stage/sub-stage, update this document:
> - Mark completed tasks with `[x]`
> - Record the actual date completed next to the stage heading
> - Add a "Notes" sub-section under the stage with anything that deviated from the plan, discovered issues, or decisions made
> - If the plan needs structural changes, update the relevant stage(s) before proceeding to the next

---

## Context

Cash-Track frontend is mid-migration. The new Vue 3 skeleton lives at `/frontend/src/`. The complete old Vue 2 app lives at `/frontend/old/` and is the source of truth for all business logic, component structure, and API contracts during migration.

**Current state of new app:**
- Working: App shell, Header component (Nuxt UI), vue-router 4 setup, Pinia scaffolding, vue-i18n 11 setup, Vite build
- Broken: Router has invalid `MagicString` runtime import; `DummyView` imported from wrong file
- Missing: API layer, auth/profile/wallet state, all page components (4 stubs only), Ukrainian i18n

**Source of truth for API contracts:** `/api/docs/openapi.yaml` (76 routes, OAS 3.1)

---

## Working Conventions

- **npm commands** (`npm install`, `npm run build`, `npm run dev`, `npm run lint`, `npm run type-check`, `npm run test:unit`) — run without asking for permission
- **Git commit after each stage:** once the testing checkpoint passes, stage all new/modified files produced by that stage and commit them on the current branch (`feature/ui-migration-claude`). Exclude any unrelated changes (e.g. files under `old/` that were not touched as part of the stage). Commit message format: `feat: stage <N> — <short description>`.
- Each sub-stage is sized to fit in one focused conversation session (~5–10 files of moderate complexity)
- Do not start a sub-stage unless its prerequisite sub-stage testing checkpoint has passed

---

## Skills to Use

Load these skills before working on the respective stages:

| Skill | When to use |
|---|---|
| `vue-best-practices` | Every stage — Vue 3 Composition API patterns, `<script setup>`, reactivity |
| `nuxt-ui` | Stages 4–8 — every component using Nuxt UI (UCard, UTabs, UModal, UForm, etc.) |
| `tailwind-design-system` | Stages 4–8 — replacing Bootstrap grid/layout with Tailwind, design tokens, responsive patterns, dynamic color classes (tag colors), progress bars, sidebar layouts. Important: Nuxt UI v4 uses Tailwind CSS v4 |
| `vue-pinia-best-practices` | Stage 3 — store definitions, `storeToRefs`, composition-style stores |
| `vue-router-best-practices` | Stages 0, 4 — navigation guards, route params, nested routes |
| `vue-testing-best-practices` | Stages 2–8 — Vitest unit tests, Vue Test Utils, component testing patterns |
| `frontend-design` | Stages 4–8 — UI design decisions, Tailwind layout, component aesthetics |
| `context7-auto-research` | Any stage — look up latest docs for vue-i18n, Nuxt UI, chart.js, axios APIs |
| `security-reviewer` | Stage 8b — auth flows, passkey implementation, token handling review |
| `openapi-spec-generation` | Stage 2a/2b — reference when generating model classes from OpenAPI schema |

---

## Library Versions

### Currently installed (new app)

| Package | Installed | Latest stable | Action |
|---|---|---|---|
| `vue` | ^3.5.13 | 3.5.30 | Upgrade — patch only |
| `vue-router` | ^4.6.4 | 5.0.3 | **Defer** — v5 breaking (removes `next()` callback, typed routes API changes). Upgrade to latest v4.x only |
| `pinia` | ^3.0.4 | 3.0.4 | Current |
| `vue-i18n` | ^11.1.4 | 11.3.0 | Upgrade — minor |
| `@nuxt/ui` | ^4.4.0 | 4.5.1 | Upgrade — patch |
| `vite` | ^6.2.4 | 8.0.0 | **Defer** — v7/v8 breaking. Upgrade to latest 6.x only |
| `@vitejs/plugin-vue` | ^5.2.3 | 6.0.5 | **Defer** — coupled to vite major. Stay on 5.x |
| `vitest` | ^3.1.1 | 4.1.0 | **Defer** — v4 breaking. Upgrade to latest 3.x |
| `vue-tsc` | ^2.2.8 | 3.2.5 | **Defer** — v3 breaking. Stay on 2.x |
| `typescript` | ~5.8.0 | 5.9.3 | Upgrade — minor |
| `sass-embedded` | ^1.89.0 | check | Run `npm outdated` — likely safe |

### New dependencies to add

| Package | Version | Purpose |
|---|---|---|
| `axios` | ^1.13.6 | HTTP client (API calls with CSRF retry) |
| `chart.js` | ^4.5.1 | Chart rendering engine |
| `vue-chartjs` | ^5.3.3 | Vue 3 bindings for Chart.js |

> **Verify versions before installing:** Run `npm show <package> version` for each — versions above were captured on 2026-03-14 and may be outdated.

---

## API Model Classes (Stage 2 specification)

All TypeScript models must be generated from `/api/docs/openapi.yaml` as the single source of truth. Do not copy types from `/frontend/old/src/api/` verbatim — the old interfaces may be out of sync with the current API.

### Design rules for model classes

Each OpenAPI schema becomes a TypeScript **class** (not just an interface) with:

1. **Typed properties** — match OAS 3.1 types exactly:
   - `type: [string, "null"]` → `string | null`
   - `format: date-time` → convert ISO string to `Date` on parse
   - `format: uuid` → `string` (no runtime UUID library needed)
   - `format: uri` → `string`
   - `type: integer` → `number`
   - `type: number` (float) → `number`

2. **Static `from(raw: unknown): ModelName` factory** — validates shape, converts types:
   ```ts
   static from(raw: unknown): Wallet {
     if (!raw || typeof raw !== 'object') {
       throw new Error('Wallet.from: expected object')
     }
     const d = raw as Record<string, unknown>
     return new Wallet({
       id: requireNumber(d, 'id'),
       name: requireString(d, 'name'),
       totalAmount: requireNumber(d, 'totalAmount'),
       isActive: requireBoolean(d, 'isActive'),
       defaultCurrency: Currency.from(d.defaultCurrency),
       updatedAt: requireDate(d, 'updatedAt'),
       // ...
     })
   }
   ```

3. **Shared primitive validators** in `src/api/models/_validators.ts`:
   ```ts
   function requireString(obj: Record<string, unknown>, key: string): string
   function requireNumber(obj: Record<string, unknown>, key: string): number
   function requireBoolean(obj: Record<string, unknown>, key: string): boolean
   function requireDate(obj: Record<string, unknown>, key: string): Date
   function optionalString(obj: Record<string, unknown>, key: string): string | null
   function optionalDate(obj: Record<string, unknown>, key: string): Date | null
   function optionalNumber(obj: Record<string, unknown>, key: string): number | null
   ```

4. **No mutation** — all properties `readonly`; use constructor or factory only.

5. **Nested models** — parse recursively:
   ```ts
   users: d.users && Array.isArray(d.users) ? d.users.map(UserShort.from) : []
   ```

### Model inventory (from OpenAPI `components.schemas`)

| Model class | File | Key fields |
|---|---|---|
| `User` | `models/user.ts` | id, name, lastName, nickName, email, isEmailConfirmed, photoUrl, defaultCurrencyCode, defaultCurrency, locale, createdAt, updatedAt |
| `UserShort` | `models/user.ts` | id, name, lastName, nickName, photoUrl |
| `Wallet` | `models/wallet.ts` | id, name, slug, totalAmount, isActive, isPublic, isArchived, defaultCurrencyCode, defaultCurrency, users (UserShort[]), latestCharges (Charge[]), createdAt, updatedAt |
| `WalletShort` | `models/wallet.ts` | id, name, slug, totalAmount, isActive, isPublic, isArchived, defaultCurrencyCode, defaultCurrency, createdAt, updatedAt |
| `WalletTotal` | `models/wallet.ts` | totalAmount, totalIncomeAmount, totalExpenseAmount, tags (array of {tagId, totalIncomeAmount, totalExpenseAmount}) |
| `Charge` | `models/charge.ts` | id (UUID string), operation ('+'/'-'), amount, title, description, userId, walletId, dateTime, createdAt, updatedAt, user (UserShort), tags (Tag[]), wallet (WalletShort) |
| `ChargeTotal` | `models/charge.ts` | totalAmount, totalIncomeAmount, totalExpenseAmount, currency |
| `ChargeTitleSuggestion` | `models/charge.ts` | title, count |
| `Tag` | `models/tag.ts` | id, name, icon (null), color (null, hex), userId, createdAt, updatedAt |
| `Limit` | `models/limit.ts` | id, operation ('+'/'-'), amount, walletId, createdAt, updatedAt, tags (Tag[]), wallet (WalletShort) |
| `WalletLimit` | `models/limit.ts` | amount (current spend), percentage (0–1+), limit (Limit) |
| `Currency` | `models/currency.ts` | id (ISO 4217 code), code, name, char (symbol), rate, updatedAt |
| `Passkey` | `models/passkey.ts` | id, name, createdAt, usedAt (Date or null) |
| `AuthResponse` | `models/auth.ts` | data ({type, id}), accessToken, accessTokenExpiredAt, refreshToken, refreshTokenExpiredAt |
| `EmailConfirmation` | `models/auth.ts` | email, createdAt, resendTimeLimit, validTimeLimit, timeSentAgo, isThrottled, isValid |
| `Pagination` | `models/pagination.ts` | page, limit, total, totalPages, hasNext, hasPrev |
| `ApiError` | `models/error.ts` | message, error (optional) |
| `ValidationError` | `models/error.ts` | errors: Record<string, string[]> |

---

## Stage Dependency Graph

```
Stage 0 (Foundation Fixes)
   |
Stage 1 (Library Versions)
   |
Stage 2a (API Client + Foundation Models)
   |
Stage 2b (Domain Model Classes)
   |
Stage 2c (API Function Modules)
   |
Stage 3a (Pinia Stores)
   |
Stage 3b (Shared Composables)
   |
Stage 4 (App Shell + Layout)
   |
   ├── Stage 5a (Wallets List) → 5b (Wallet CRUD) → 5c (Wallet Detail + Charges) → 5d (Charts + Limits)
   ├── Stage 6 (Tags Pages)
   ├── Stage 7 (Profile Page)
   └── Stage 8a (Profile Settings) → 8b (Security + Passkeys)
               |
           Stage 9 (Cleanup) ← all of 5a–5d, 6, 7, 8a–8b
```

Stages 5a, 6, 7, and 8a are independently startable after Stage 4. Within the wallets track, 5a→5b→5c→5d must be sequential.

---

## Stage 0: Foundation Fixes — 2026-03-15

**Prerequisites:** None
**Estimated AI time:** ~20 min (1 session)
**Status:** `[x] Complete`

**Goals:** Eliminate broken imports and dead code so the app compiles and runs cleanly.

### Tasks

- [x] Create `src/views/DummyView.vue` — explicit stub (UContainer with "Coming soon")
- [x] Fix `src/router/index.ts`:
  - Remove `import { MagicString } from 'vue/compiler-sfc'` (line 6)
  - Fix `import DummyView from '@/views/TagsView.vue'` → `import DummyView from '@/views/DummyView.vue'`
  - Rewrite `beforeEach` guard — replace `instanceof MagicString` with `typeof namedTitle === 'string'` and `String.prototype.replace(/\{name\}/g, ...)`
- [x] Delete `src/stores/counter.ts`
- [x] Port `uk.ts` i18n messages — already identical, no changes needed

### Testing checkpoint

- `npm run build` — zero errors
- `npm run lint` — passes
- `npm run test:unit` — passes (no tests yet; `passWithNoTests: true` added)

### Notes

- `src/App.vue` had pre-existing TS errors indexing `@nuxt/ui/locale` with a `string` type — fixed with `keyof typeof locales` cast.
- `src/components/Header.vue` renamed to `AppHeader.vue` to satisfy `vue/multi-word-component-names` lint rule.
- `old/` added to `.gitignore` and ESLint `globalIgnores` to prevent linting legacy Vue 2 code; `old/**` added to vitest exclude list.
- `replaceAll` not available in TS lib target — used `replace(/\{name\}/g, ...)` instead.

---

## Stage 1: Library Versions Verification — 2026-03-15

**Prerequisites:** Stage 0
**Estimated AI time:** ~30 min (1 session)
**Status:** `[x] Complete`

**Goals:** Lock in a stable dependency baseline. Add new runtime dependencies.

### Tasks

- [x] Run `npm outdated` — record all outdated packages
- [x] Re-verify latest versions: `npm show <pkg> version` for each package in the table above
- [x] Upgrade safe packages:
  ```bash
  npm install vue@latest vue-i18n@latest "@nuxt/ui@latest" typescript@latest
  ```
- [x] Add new dependencies:
  ```bash
  npm install axios chart.js vue-chartjs
  ```
- [x] Upgrade to latest within current major for deferred packages:
  ```bash
  npm install "vue-router@^4" "vite@^6" "@vitejs/plugin-vue@^5" "vitest@^3"
  ```
- [x] Run `npm run build && npm run test:unit` after each install group; fix breakage before proceeding
- [x] Record final resolved versions in Notes below

### Testing checkpoint

- `npm run build` — zero errors
- `npm run type-check` — clean
- `npm run test:unit` — all pass
- `npm run dev` — app loads without console errors

### Notes

Final resolved versions after Stage 1:

| Package | Version |
|---|---|
| `vue` | ^3.5.30 |
| `vue-i18n` | ^11.3.0 |
| `@nuxt/ui` | ^4.5.1 |
| `typescript` | ^5.9.3 |
| `axios` | ^1.13.6 |
| `chart.js` | ^4.5.1 |
| `vue-chartjs` | ^5.3.3 |
| `vue-router` | ^4.6.4 (already current) |
| `vite` | ^6.4.1 |
| `@vitejs/plugin-vue` | ^5.2.4 |
| `vitest` | ^3.1.1 (already current 3.x) |
| `vue-tsc` | ^2.2.8 (deferred) |

All three install groups passed `npm run build`, `npm run type-check`, and `npm run test:unit` without errors.

---

## Stage 2a: API Client + Foundation Models — 2026-03-15

**Prerequisites:** Stage 1
**Estimated AI time:** ~45 min (1 session)
**Files:** `client.ts`, `_validators.ts`, `models/error.ts`, `models/pagination.ts`, `shared/env.ts`
**Status:** `[x] Complete`

**Goals:** Build the axios client with CSRF retry logic and the shared validator utilities + foundation types that all domain models depend on.

### Tasks

- [ ] `src/shared/env.ts` — environment variable accessor; adapt `VUE_APP_*` → `VITE_*` (port from `old/src/shared/env.ts`)
- [ ] `src/shared/links.ts` — verify existing `webSiteLink()` works with `VITE_WEBSITE_URL`; add `gatewayLink()` if needed
- [ ] `src/api/models/_validators.ts` — implement all 7 validator functions: `requireString`, `requireNumber`, `requireBoolean`, `requireDate`, `optionalString`, `optionalDate`, `optionalNumber`
- [ ] `src/api/models/error.ts` — `ApiError` class, `ValidationError` class
- [ ] `src/api/models/pagination.ts` — generic `Pagination<T>` class with `from()` factory
- [ ] `src/api/client.ts`:
  - Axios instance: `baseURL: import.meta.env.VITE_GATEWAY_URL`, `withCredentials: true`
  - Response interceptor: 401 → redirect to `webSiteLink('/login')`
  - Response interceptor: 417 → throw `CsrfError`
  - `apiCall<T>(fn)` wrapper: execute → catch `CsrfError` → `GET /csrf` → retry once → on second failure redirect to login
  - Port logic from `old/src/api/client.ts`; drop class `Repository` and `@ApiCall` decorator

### Testing checkpoint

- `npm run type-check` — clean
- Unit tests: `apiCall` mock 417 → verifies CSRF retry fires; second 417 → redirects
- Unit tests: `requireString` throws on missing key; `optionalDate` returns null for null input; `Pagination.from()` parses correctly
- `npm run build` — zero errors

### Notes

- `CsrfError` exported (not private) to enable clean unit testing of the retry path in `apiCall`.
- `apiCall` accepts an optional `instanceFactory` param so tests can inject a mock `AxiosInstance` without any module-level mocking.
- `src/shared/env.ts` added — thin wrapper over `import.meta.env` with strict `ImportMetaEnv` key typing; old `getEnv()` pattern (reading from `window.configs`) dropped — new app is pure Vite.
- `src/shared/links.ts` extended with `gatewayLink()`.
- `env.d.ts` updated: added `VITE_GATEWAY_URL`, removed the stale `// more env variables...` comment.
- 39 unit tests written across 4 spec files; all pass.

---

## Stage 2b: Domain Model Classes — 2026-03-15

**Prerequisites:** Stage 2a
**Estimated AI time:** ~1 h (1 session)
**Files:** 8 model files in `src/api/models/`
**Status:** `[x] Complete`

**Goals:** Generate all domain model classes from the OpenAPI schema. Every model must parse, validate, and type-convert API responses.

> **Reference:** Read `/api/docs/openapi.yaml` `components.schemas` section at the start of this session.

### Tasks

- [ ] `src/api/models/currency.ts` — `Currency` (simplest, no nested models — start here)
- [ ] `src/api/models/user.ts` — `User`, `UserShort`
- [ ] `src/api/models/tag.ts` — `Tag`
- [ ] `src/api/models/passkey.ts` — `Passkey` (usedAt is nullable Date)
- [ ] `src/api/models/auth.ts` — `AuthResponse`, `EmailConfirmation`
- [ ] `src/api/models/charge.ts` — `Charge` (nested: UserShort, Tag[], WalletShort), `ChargeTotal`, `ChargeTitleSuggestion`
- [ ] `src/api/models/limit.ts` — `Limit` (nested: Tag[], WalletShort), `WalletLimit`
- [ ] `src/api/models/wallet.ts` — `Wallet`, `WalletShort`, `WalletTotal` (most complex — nested: Currency, UserShort[], Charge[], and circular-ish references; build last)

> **Circular reference note:** `Wallet` contains `latestCharges: Charge[]` and `Charge` contains `wallet: WalletShort`. Use `WalletShort` (not `Wallet`) in `Charge` to avoid circular imports.

### Testing checkpoint

- `npm run type-check` — clean across all 8 model files
- Unit tests: `Wallet.from()` with valid fixture data parses all nested models; `Wallet.from()` with missing `id` throws with field name in error message; `Charge.from()` converts `dateTime` ISO string to `Date`
- `npm run build` — zero errors
- Manual: import `Wallet` in a component, verify IDE autocomplete shows all typed properties

### Notes

- `Wallet` extends `WalletShort` via class inheritance to avoid duplicating 10 shared fields — `Wallet.from()` still constructs the full object directly via the parent constructor.
- `wallet.ts` ↔ `charge.ts` is a circular ESM module reference (`Wallet` needs `Charge[]`; `Charge` needs `WalletShort`). Safe because both sides only reference each other inside method bodies, never at module init time. Confirmed working with Vite/ESM at build and test time.
- `WalletTotalTag` is an inline `interface` (not a class) — it has no runtime parsing behaviour of its own, just plain data pulled from the array.
- `WalletLimit.isExceeded` computed getter added as a convenience (percentage > 1).
- `User.displayName` and `UserShort.displayName` getters added for use in header/avatar components.
- 12 spec files, 83 tests total across both 2a and 2b; all pass.

---

## Stage 2c: API Function Modules

**Prerequisites:** Stage 2b
**Estimated AI time:** ~1.5 h (1 session)
**Files:** 11 API function modules
**Status:** `[ ] Not started`

**Goals:** Implement all API call functions as plain async functions returning typed model instances.

### Tasks

- [ ] `src/api/currency.ts` — `getCurrencies(): Promise<Currency[]>`
- [ ] `src/api/users.ts` — `getUser(id: number): Promise<UserShort>`
- [ ] `src/api/auth.ts` — `login`, `loginPasskey`, `loginPasskeyInit`, `loginGoogle`, `register`, `logout`, `refreshToken`
- [ ] `src/api/profile.ts` — `getProfile`, `updateProfile`, `uploadPhoto`, `updateLocale`, `checkNickName`, `getChargesFlowStats`, `getCounterStats`, `getLatestWallets`
- [ ] `src/api/profile/email.ts` — `getEmailConfirmation`, `confirmEmail`, `resendEmailConfirmation`
- [ ] `src/api/profile/password.ts` — `updatePassword`, `forgotPassword`, `resetPassword`
- [ ] `src/api/profile/passkeys.ts` — `getPasskeys`, `initPasskey`, `storePasskey`, `deletePasskey`
- [ ] `src/api/tags.ts` — `getTags`, `createTag`, `updateTag`, `deleteTag`, `getTagCharges`, `getTagTotals`, `getWalletTags`, `createWalletTag`, `updateWalletTag`, `deleteWalletTag`
- [ ] `src/api/limits.ts` — `getLimits`, `createLimit`, `deleteLimit`
- [ ] `src/api/charges.ts` — `getCharges`, `createCharge`, `getCharge`, `updateCharge`, `deleteCharge`, `getChargeTitles`
- [ ] `src/api/wallets.ts` — `getWallets`, `getUnarchived`, `getArchived`, `getWallet`, `createWallet`, `updateWallet`, `deleteWallet`, `activateWallet`, `archiveWallet`, `getWalletTotals`, `sortWallets`, `shareWallet`, `unshareWallet`, `getWalletUsers`
- [ ] `src/api/graph.ts` — `getChargesFlowByDate`

### Testing checkpoint

- `npm run type-check` — clean across all modules
- Unit tests: `getWallets()` — mock axios, verify returns `Wallet[]`; `createCharge()` — verify calls correct endpoint with correct body
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 3a: Pinia Stores

**Prerequisites:** Stage 2c
**Estimated AI time:** ~45 min (1 session)
**Files:** 4 store files
**Status:** `[ ] Not started`

**Goals:** Replace Vuex with Pinia stores for auth, profile, and wallets state.

### Tasks

- [ ] `src/stores/auth.ts` — `useAuthStore`:
  - State: `isLogged: boolean`, `isEmailConfirmed: boolean`
  - Actions: `login(profile: User)`, `logout()` (clears state, redirects to `webSiteLink('/')`)
- [ ] `src/stores/profile.ts` — `useProfileStore`:
  - State: `profile: User | null`, `loading: boolean`
  - Actions: `loadProfile()` (calls `getProfile()`, commits to auth store, syncs locale from profile), `updatePhotoUrl(url: string)`
- [ ] `src/stores/wallets.ts` — `useWalletsStore`:
  - State: `activeWallets: Wallet[]`, `loading: boolean`, `failed: boolean`
  - Actions: `loadActive()` (calls `getUnarchived()`, handles error state)
- [ ] Update `src/stores/locale.ts`:
  - Add cookie persistence (`cshtrkl` cookie, 365 days, strict sameSite)
  - Add `loadCachedLocale()` action
  - Sync with vue-i18n `locale` ref on change

### Testing checkpoint

- Unit tests: `useAuthStore.login()` sets `isLogged: true`; `logout()` resets state; `useProfileStore.loadProfile()` mocked — verifies `useAuthStore.login()` called with profile data
- `npm run type-check` — clean
- Manual: wire `loadProfile()` to `App.vue` `onMounted`, verify profile appears in Pinia devtools

### Notes
<!-- Update after completing this stage -->

---

## Stage 3b: Shared Composables

**Prerequisites:** Stage 3a
**Estimated AI time:** ~30 min (1 session)
**Files:** 4 composables
**Status:** `[ ] Not started`

**Goals:** Extract reusable composables for formatting, error handling, and notifications.

### Tasks

- [ ] `src/composables/useMoneyFormatter.ts` — `format(amount: number, currency: Currency): string`; port from `old/src/shared/numbers.ts`; use `Intl.NumberFormat`
- [ ] `src/composables/useTimeAgo.ts` — `timeAgo(date: Date): string`; relative time using `Intl.RelativeTimeFormat`; no new dependency
- [ ] `src/composables/useApiErrors.ts` — accepts Axios error, returns reactive `fieldErrors: Ref<Record<string, string[]>>` and `generalError: Ref<string | null>`; resets on new request
- [ ] `src/composables/useNotifications.ts` — wrapper around Nuxt UI toast (`useToast`) for `notifySuccess(msg)` and `notifyError(msg)` with consistent styling

### Testing checkpoint

- Unit tests: `useMoneyFormatter` — `format(1234.5, usdCurrency)` returns `$1,234.50`; `useApiErrors` — extracts `errors.name[0]` from a mock 422 response; `useTimeAgo` — date 1 hour ago returns locale-appropriate string
- `npm run type-check` — clean
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 4: App Shell + Layout

**Prerequisites:** Stage 3b
**Estimated AI time:** ~45 min (1 session)
**Files:** 3 files modified/created
**Status:** `[ ] Not started`

**Goals:** Wire the app shell so profile loads on mount, layout renders correctly for authenticated users, navigation is functional, and the email-not-confirmed banner works globally.

> **Skills:** Load `tailwind-design-system` before this stage — the layout shell and spacing scale established here are inherited by all page stages.

### Tasks

- [ ] `src/App.vue`:
  - Call `useProfileStore().loadProfile()` on mount
  - Show loading skeleton (Tailwind `animate-pulse`) while profile loads
  - Conditionally render layout vs. redirect based on `useAuthStore().isLogged`
- [ ] Wire `src/components/Header.vue` to real stores:
  - User name/avatar from `useProfileStore`
  - Logout button → `useAuthStore().logout()`
  - Active nav item highlights current route via `useRoute()`
  - Locale switcher → `useLocaleStore`
- [ ] `src/components/Footer.vue` — port from `old/src/components/Footer.vue`; replace Bootstrap with Tailwind/Nuxt UI
- [ ] Global email-not-confirmed banner in `App.vue` — `UAlert` shown when `!useAuthStore().isEmailConfirmed`; resend button calls `resendEmailConfirmation()`

### Testing checkpoint

- `npm run dev` — app loads, profile fetch fires on mount (visible in network tab)
- Header shows user name/avatar (or gracefully handles 401)
- Navigation between `/wallets`, `/profile`, `/tags` works; document titles update
- Locale switcher changes language
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 5a: Wallets List

**Prerequisites:** Stage 4
**Estimated AI time:** ~1 h (1 session)
**Files:** 4 new components + WalletsView update
**Status:** `[ ] Not started`

**Goals:** Implement the wallets listing page with active/archived tabs and wallet cards.

> **Skills:** Load `tailwind-design-system` — establish the wallet card grid pattern (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) used throughout the app.

### Tasks

- [ ] `src/views/WalletsView.vue` — replace stub; `UTabs` (Active/Archived tabs); "Create wallet" `UButton` linking to `wallets.create`; calls `useWalletsStore().loadActive()` on mount
- [ ] `src/components/wallets/WalletsActiveGridList.vue` — reads from `useWalletsStore`, renders loading/error/empty states, passes wallets to `WalletsGridList`
- [ ] `src/components/wallets/WalletsGridList.vue` — accepts `wallets: Wallet[]` prop + `byArchived: boolean`; calls `getArchived()` when `byArchived`; renders grid of `WalletCard`
- [ ] `src/components/wallets/WalletCard.vue`:
  - Shows: name, balance (formatted via `useMoneyFormatter`), currency code, member avatars (`UAvatar`), last updated (`useTimeAgo`), latest 3 charges preview
  - Active badge (`UBadge`) if `wallet.isActive`; Archived badge if `wallet.isArchived`
  - Click → `router.push({ name: 'wallets.show', params: { walletID } })`
  - Hover border highlight via Tailwind

### Testing checkpoint

- Unit tests: `WalletCard` renders wallet name and formatted balance; active badge visible when `isActive: true`
- Manual:
  - [ ] `/wallets` loads with Active tab showing wallet cards
  - [ ] Archived tab loads archived wallets lazily
  - [ ] Clicking a wallet card navigates to wallet detail route
  - [ ] Empty state shown when no wallets
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 5b: Wallet CRUD Forms

**Prerequisites:** Stage 5a
**Estimated AI time:** ~1.5 h (1 session)
**Files:** 7 new files
**Status:** `[ ] Not started`

**Goals:** Implement wallet create, edit, and share flows.

### Tasks

- [ ] `src/views/WalletCreateView.vue` + `src/components/wallets/WalletCreate.vue`:
  - Form: name (`UInput`), currency selector (`USelect` from `getCurrencies()`), isPublic toggle
  - Submit calls `createWallet()`, redirects to `wallets.show` on success
  - `useApiErrors` for field validation display
- [ ] `src/views/WalletEditView.vue` + `src/components/wallets/WalletEdit.vue`:
  - Loads wallet by `walletID` prop on mount
  - Pre-fills form from wallet data; submit calls `updateWallet()`
  - Delete button opens `UModal` confirmation → calls `deleteWallet()` → redirects to `/wallets`
- [ ] `src/views/WalletShareView.vue` + `src/components/wallets/WalletShare.vue` + `src/components/wallets/WalletSharedMember.vue`:
  - Lists current wallet members as `WalletSharedMember` items
  - Each member: avatar, name, remove button → calls `unshareWallet(walletId, userId)`
  - User search input → calls `getUser()` by ID or nick → "Add" button → calls `shareWallet()`

### Testing checkpoint

- Unit tests: `WalletCreate` form — name required, submits `createWallet()` with correct payload; `WalletEdit` delete button triggers modal
- Manual:
  - [ ] Create wallet → appears in wallet list
  - [ ] Edit wallet name → saved
  - [ ] Delete wallet (with confirmation) → redirects to `/wallets`
  - [ ] Share wallet with another user → member appears
  - [ ] Remove member → member disappears
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 5c: Wallet Detail + Charges

**Prerequisites:** Stage 5b
**Estimated AI time:** ~2 h (1 session)
**Files:** 7 new files — the decomposition of the old 942-line `WalletView`
**Status:** `[ ] Not started`

**Goals:** Implement the wallet detail page and the full charge management flow (create, list, filter, edit, delete).

### Tasks

- [ ] `src/views/WalletView.vue` — thin orchestration only: loads wallet by `walletID`, passes data to sub-components, no business logic inline
- [ ] `src/components/wallets/WalletHeader.vue` — wallet name, total balance (`useMoneyFormatter`), currency badge, action buttons (Edit/Share/Archive as `UDropdownMenu` or `UButton` group)
- [ ] `src/components/wallets/charges/ChargesFilter.vue` — date range pickers, tag multi-select (`TagFormInput`), search text; emits `filter-change` event with filter state
- [ ] `src/components/wallets/charges/ChargesList.vue` — calls `getCharges()` with filter params; paginated list with `UPagination`; renders `ChargeItem` per row
- [ ] `src/components/wallets/charges/ChargeItem.vue` — operation icon (`i-heroicons-arrow-up` green / `i-heroicons-arrow-down` red), title, amount, tags as `Tag` chips, `useTimeAgo`, edit/delete action buttons
- [ ] `src/components/wallets/charges/ChargeEdit.vue` — same form as `ChargeCreate`, pre-filled from charge data; `updateCharge()` on save
- [ ] `src/components/wallets/charges/ChargeCreate.vue`:
  - Amount `UInput`, operation toggle (+/-) as `UButtonGroup`
  - Title `UInput` with autocomplete from `getChargeTitles()` results
  - Tags multi-select using `TagFormInput`
  - Optional dateTime picker
  - Submit calls `createCharge()`, emits `charge-created` to parent

### Testing checkpoint

- Unit tests: `ChargeItem` shows green up-arrow for `operation: '+'`; `ChargesFilter` emits `filter-change` on date change; `ChargeCreate` validates amount > 0
- Manual:
  - [ ] Wallet detail page loads with header and charges list
  - [ ] Add a charge (+ income) → balance updates, appears in list
  - [ ] Add a charge (- expense) → balance updates
  - [ ] Filter charges by date range → list updates
  - [ ] Filter by tag → only matching charges shown
  - [ ] Edit charge → changes saved
  - [ ] Delete charge → removed from list
  - [ ] Pagination works (if enough charges)
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 5d: Charts + Limits

**Prerequisites:** Stage 5c
**Estimated AI time:** ~1.5 h (1 session)
**Files:** 5 new files
**Status:** `[ ] Not started`

**Goals:** Add charts to the wallet detail page and implement the budget limits feature.

### Tasks

- [ ] `src/components/wallets/charges/ChargesFlowChart.vue` — `vue-chartjs` bar chart; calls `getChargesFlowByDate(walletId, from, to)`; income bars green, expense bars red; date range selector
- [ ] `src/components/wallets/charges/ChargesTotalChart.vue` — `vue-chartjs` doughnut; data from `getWalletTotals().tags`; each segment = one tag's share of expenses
- [ ] `src/components/wallets/limits/LimitForm.vue` — operation toggle (+/-), amount `UInput`, tags multi-select; submit calls `createLimit()`
- [ ] `src/components/wallets/limits/WalletLimitItem.vue` — limit description (tags + direction + amount), Tailwind progress bar (`bg-green-500`/`bg-red-500` based on percentage), delete button
- [ ] `src/components/wallets/limits/WalletLimitsTotal.vue` — calls `getLimits(walletId)`, renders list of `WalletLimitItem`, "Add limit" button that opens `LimitForm`

### Testing checkpoint

- Unit tests: chart components mount without errors (mock `vue-chartjs`); `WalletLimitItem` progress bar is red when `percentage > 1`
- Manual:
  - [ ] Charts render with real data (not empty, not erroring)
  - [ ] Flow chart date range can be adjusted
  - [ ] Add limit → appears with progress bar
  - [ ] Limit progress bar turns red when exceeded
  - [ ] Delete limit → removed
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 6: Tags Pages

**Prerequisites:** Stage 4 (independent of Stage 5)
**Estimated AI time:** ~1.5 h (1 session)
**Files:** 6 new files
**Status:** `[ ] Not started`

**Goals:** Tag listing with full CRUD and tag detail page with associated charges and statistics.

> **Skills:** Load `tailwind-design-system` for `Tag.vue` — tags have dynamic `color` (hex string) from the API. Tailwind JIT cannot generate arbitrary hex-based classes at runtime. Use CSS custom properties: `style="--tag-color: {{ tag.color }}"` with a fixed class using `bg-[var(--tag-color)]` (Tailwind v4 arbitrary value). Decide the pattern here; it will apply wherever tags are rendered.

### Component map

```
views/TagsView.vue
views/TagView.vue
components/tags/
  Tag.vue                # display chip with color and icon
  TagForm.vue            # name, icon, color form
  CreateTag.vue          # wraps TagForm for creation
  TagFormInput.vue       # multi-select tag input (reused in ChargeCreate/Edit)
```

### Tasks

- [ ] `src/components/tags/Tag.vue` — colored chip: `icon` + `name`; dynamic background from `tag.color` using CSS custom property; click navigates to `tags.show`
- [ ] `src/components/tags/TagForm.vue` — name field (minLength 3, pattern `^\S+$` no spaces), optional icon (emoji), optional color (swatches or `<input type="color">`); `useApiErrors`
- [ ] `src/components/tags/CreateTag.vue` — wraps `TagForm`; calls `createTag()`; emits `tag-created`
- [ ] `src/components/tags/TagFormInput.vue` — multi-select input that fetches `getTags()`, renders selected tags as `Tag` chips, allows deselecting; used in `ChargeCreate`/`ChargeEdit`
- [ ] `src/views/TagsView.vue` — replace stub; grid of `Tag` components; inline `CreateTag` form; edit (opens `TagForm` inline) / delete per tag with confirmation
- [ ] `src/views/TagView.vue` — tag name/color header; reuses `ChargesFilter` + `ChargesList` components from Stage 5c; `ChargesFlowChart` from Stage 5d showing this tag's totals from `getTagTotals()`

### Testing checkpoint

- Unit tests: `Tag.vue` — `style` attribute contains the tag's hex color; `TagForm` — validates name min-length and no-spaces pattern
- Manual:
  - [ ] Create tag with name, icon, color → appears in list with correct color
  - [ ] Edit tag color → updates
  - [ ] View tag detail → charges for that tag load with filter/pagination
  - [ ] Delete tag → removed
  - [ ] Tag multi-select in charge form shows all tags; selected ones appear as chips
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 7: Profile Page

**Prerequisites:** Stage 4 (independent of Stages 5–6)
**Estimated AI time:** ~1.5 h (1 session)
**Files:** 9 new files
**Status:** `[ ] Not started`

**Goals:** Profile summary page with user info, statistics, latest wallets, common tags, and email confirmation alert.

> **Skills:** Load `tailwind-design-system` for the stats grid — `CountersStatistics` and `ChargesStatsCard` use a responsive multi-column grid; reuse design tokens established in Stage 5.

### Component map

```
views/ProfileView.vue
components/profile/
  ProfileTitle.vue
  ProfileAvatar.vue
  ProfileAvatarBadge.vue
  LatestWallets.vue
  CommonTags.vue
  CountersStatistics.vue
  ChargesFlowStatistics.vue
  ChargesStatsCard.vue
  EmailIsNotConfirmedAlert.vue
```

### Tasks

- [ ] `src/views/ProfileView.vue` — replace stub; layout: avatar + title top, stats grid, latest wallets + common tags columns
- [ ] `src/components/profile/ProfileAvatar.vue` — `UAvatar` wrapper; shows `profile.photoUrl` or initials fallback from `profile.name`
- [ ] `src/components/profile/ProfileAvatarBadge.vue` — wraps `ProfileAvatar` with email-confirmed indicator badge
- [ ] `src/components/profile/ProfileTitle.vue` — display name, `@nickName`, email
- [ ] `src/components/profile/CountersStatistics.vue` — calls `getCounterStats()`; renders stat cards (wallet count, charge count, etc.)
- [ ] `src/components/profile/ChargesStatsCard.vue` — single stat card used inside `CountersStatistics`
- [ ] `src/components/profile/ChargesFlowStatistics.vue` — calls `getChargesFlowStats()`; renders income vs expense summary (amounts + currency)
- [ ] `src/components/profile/LatestWallets.vue` — calls `getLatestWallets()`; compact wallet list with balance
- [ ] `src/components/profile/CommonTags.vue` — renders tag chips from profile stats (reuses `Tag.vue`)
- [ ] `src/components/profile/EmailIsNotConfirmedAlert.vue` — `UAlert` warning variant; shown when `!useAuthStore().isEmailConfirmed`; "Resend" button calls `resendEmailConfirmation()`; success/error via `useNotifications`

### Testing checkpoint

- Unit tests: `EmailIsNotConfirmedAlert` renders when `isEmailConfirmed: false`, hidden when `true`
- Manual:
  - [ ] Profile page loads with all sections populated
  - [ ] Stats show real numbers
  - [ ] Latest wallets listed
  - [ ] Email confirmation alert visible when email not confirmed; resend works
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 8a: Profile Settings

**Prerequisites:** Stage 4 (independent of Stages 5–7)
**Estimated AI time:** ~1 h (1 session)
**Files:** 5 new files + router update
**Status:** `[ ] Not started`

**Goals:** Settings layout shell and profile editing (name, photo, email, locale).

> **Skills:** Load `tailwind-design-system` for `SettingsView.vue` — the two-column sidebar + content layout (`lg:grid-cols-[240px_1fr]`) is structurally distinct from the rest of the app.

### Tasks

- [ ] `src/views/settings/SettingsView.vue` — sidebar nav layout using Nuxt UI `UNavigationMenu`; nested `<RouterView />`; links to `settings.profile` and `settings.security`
- [ ] Update `src/router/index.ts` — replace `DummyView` for settings routes with real components; confirm nested route structure is correct
- [ ] `src/views/settings/ProfileSettingsView.vue` — composes `ProfileSettings`, `EmailFormInput`, `ProfilePhoto` in stacked sections
- [ ] `src/components/settings/ProfileSettings.vue` — form: name, lastName, nickName (with uniqueness check via `checkNickName()`), defaultCurrencyCode (`USelect`), locale toggle; `updateProfile()` on save; `useApiErrors`
- [ ] `src/components/settings/EmailFormInput.vue` — displays current email; "Change email" flow (depends on API — may just show current state)
- [ ] `src/components/settings/ProfilePhoto.vue` — current photo preview or avatar initials; upload `<input type="file">` → calls `uploadPhoto()`; loading state during upload; `useNotifications` on success/error

### Testing checkpoint

- Unit tests: `ProfileSettings` form — nickName uniqueness check fires on blur; `ProfilePhoto` calls `uploadPhoto` with FormData
- Manual:
  - [ ] Navigate to Settings → Profile tab
  - [ ] Edit name → saved, header updates
  - [ ] Upload photo → appears in header avatar
  - [ ] Change locale from settings → app language changes
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 8b: Security + Passkeys

**Prerequisites:** Stage 8a
**Estimated AI time:** ~1.5 h (1 session)
**Files:** 5 new files
**Status:** `[ ] Not started`

**Goals:** Password change and WebAuthn passkey management.

> **Skills:** Load `security-reviewer` before this stage — WebAuthn credential handling and password change flows require careful input validation and error handling.

### Tasks

- [ ] `src/views/settings/SecuritySettingsView.vue` — composes `SecuritySettings` and `PasskeysSettings`
- [ ] `src/components/settings/SecuritySettings.vue` — password change form: currentPassword, newPassword (min 6), newPasswordConfirmation; `updatePassword()` on submit; `useApiErrors` for field errors; `useNotifications` for success
- [ ] `src/components/settings/passkeys/PasskeysSettings.vue` — loads passkey list via `getPasskeys()`; "Add passkey" button triggers WebAuthn registration flow (`initPasskey()` → browser credential creation → `storePasskey()`)
- [ ] `src/components/settings/passkeys/PasskeysSettingsCard.vue` — card layout wrapper for the passkeys section
- [ ] `src/components/settings/passkeys/PasskeyItem.vue` — passkey name, `createdAt` date, `usedAt` (`useTimeAgo` or "Never"), delete button with confirmation → `deletePasskey()`

### Testing checkpoint

- Unit tests: `SecuritySettings` validates `newPassword` min-length and confirmation match; `PasskeyItem` renders "Never used" when `usedAt` is null
- Manual:
  - [ ] Navigate Settings → Security tab
  - [ ] Change password (valid) → success notification
  - [ ] Change password (wrong current) → field error shown
  - [ ] View passkeys list
  - [ ] Delete a passkey → removed from list
  - [ ] Register new passkey (requires WebAuthn-capable browser)
- `npm run build` — zero errors

### Notes
<!-- Update after completing this stage -->

---

## Stage 9: Cleanup + Final Verification

**Prerequisites:** Stages 5a–5d, 6, 7, 8a–8b all complete
**Estimated AI time:** ~45 min (1 session)
**Status:** `[ ] Not started`

**Goals:** Remove all migration scaffolding, delete the old app, and confirm the new app is production-ready.

### Tasks

- [ ] Remove `src/views/DummyView.vue` — every route must point to a real view
- [ ] Remove `AboutView.vue` if unused
- [ ] Delete `/frontend/old/` directory entirely
- [ ] Verify zero references to `old/`: `grep -r "from.*old/" src/` must return nothing
- [ ] i18n audit: extract all `t('key')` usages from `src/`, compare against `en.ts` and `uk.ts` key sets; add any missing keys
- [ ] Dead code audit: check for unused imports, stores, composables; `npm run lint` must pass clean
- [ ] `npm run type-check` — zero errors
- [ ] Update E2E tests in `e2e/` to cover:
  - [ ] Login → view wallets → create wallet → add charge → logout
  - [ ] Profile view → settings → change name
  - [ ] Tags CRUD
- [ ] `npm run test:e2e` — all passing
- [ ] `npm run build` — zero errors, zero warnings
- [ ] Bundle audit: confirm no Bootstrap CSS in `dist/assets/`
- [ ] Manual full walkthrough:
  - [ ] Every route navigates correctly
  - [ ] Both locales (EN, UK) work
  - [ ] Dark mode works (Nuxt UI color mode)
  - [ ] Mobile responsive layout

### Testing checkpoint (final)

- `npm run build` — clean
- `npm run type-check` — clean
- `npm run lint` — clean
- `npm run test:unit` — all passing
- `npm run test:e2e` — all passing
- Zero references to: Bootstrap, Vuex, `old/`, `DummyView`, `vue-property-decorator`, `@Component`
- All routes in `router/index.ts` point to real, implemented view components

### Notes
<!-- Update after completing this stage -->

---

## Iteration Verification Protocol

After completing each stage/sub-stage, before marking it done and moving to the next:

1. **Automated checks** — run in order:
   ```bash
   npm run type-check
   npm run lint
   npm run test:unit
   npm run build
   ```
   All must pass. Do not proceed with failures outstanding.

2. **Manual visual verification** — open `npm run dev` and test every feature introduced in the stage:
   - Navigate to affected routes
   - Interact with forms (valid input, invalid input, submit)
   - Check responsive layout (resize window to mobile width)
   - Check both EN and UK locales if any i18n strings were added
   - Check light and dark color modes

3. **Corrections** — if visual or functional issues are found:
   - Fix before marking the stage complete
   - Document the issue and fix in the stage's Notes section

4. **Update this document:**
   - Mark completed tasks `[x]`
   - Record completion date in the stage heading
   - Add Notes with deviations, discoveries, or decisions made
   - If a future stage needs changes based on what was learned, update it now
