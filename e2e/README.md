# Cash-Track Frontend — E2E (Playwright)

The 22 specs (S1–S22) **are** the coverage source of truth — one per surface (navigation, wallets,
charges, tags, profile, settings, limits, error states, responsive, i18n/theme), 180 cases total.
Shared conventions are documented below and in the `cash-track-frontend` skill.

## Running

```bash
npm run test:e2e                                  # all desktop + mobile specs
npx playwright test --project=chromium <file>     # one desktop spec
npx playwright test --project=mobile-chrome       # mobile specs (*.mobile.spec.ts)
npm run test:e2e:smoke                            # P0 smoke subset (@smoke); add -- --workers=1 to serialize
```

The dev stack must already be running (`https://my.dev-cash-track.app` + gateway). Auth is handled
once by `setup/global-setup.ts` (logs in via the gateway, saves `setup/.auth.json`); every spec
reuses it through `storageState`. **Never read `.env.local`** — dotenv loads the
credentials automatically.

## Projects

| Project | Viewport | Picks up |
|---|---|---|
| `setup` | — | `global-setup.ts` (login) |
| `chromium` | Desktop Chrome 1280×720 | every `*.spec.ts` **except** `*.mobile.spec.ts` |
| `mobile-chrome` | Pixel 5 (393×851, touch) | only `*.mobile.spec.ts` |

Put mobile-only behaviour in a `*.mobile.spec.ts` file (S21) or a `test.describe` that calls
`test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`.

## Shared helpers (`support/`) — use these, don't re-derive

```ts
import {
    label, labelExact,                 // i18n.ts   — bilingual EN|UK accessible-name regex
    routeError, routeAbort, routeEmpty, routeJson, route422, route401, routeDelay, // state.ts
    createWalletViaApi, createTagViaApi, createChargeViaApi, deleteWalletViaApi,    // factories.ts
    shell, wallet, charge, tag, settings, overlay, assertNoErrorLeak,              // selectors.ts
} from '../support'
```

- **`label('wallets.create')`** → `/Create|Створити/i`. Resolves both message files at build time,
  so it stays in sync. Use `labelExact(...)` for whole-name matches (tolerates a trailing `*`).
- **State injection** (`state.ts`): install `page.route(...)` helpers **before** `page.goto(...)`.
  Globs are host-agnostic (`**/api/...`) and catch the gateway origin. Envelope is `{ "data": ... }`.
- **Factories** (`factories.ts`): seed preconditions over the gateway API with the test `request`
  fixture (shares auth cookies; mirrors the app's 417→`/csrf`→retry). Name strays `E2E …` and
  delete what you create.

## Non-negotiable conventions (full list in the plan §3)

1. No bare translated-string assertions — `label()`/role/aria only.
2. Every page test asserts the negative: `await assertNoErrorLeak(page)`.
3. No fixed row counts — `.first()`, unique timestamped names, visibility assertions.
4. Each test seeds its own state via `page.goto` / factories; no cross-test dependencies.
5. Clean up created entities (create-then-delete) or tag them `E2E `.

## Gotchas that bite (see plan §5/§6)

- **Charge row actions** are `invisible group-hover:visible … pointer-coarse:visible`: on desktop
  `await row.hover()` first; on touch (mobile project) they're always visible.
- **Reka `UTabs`** mounts only the active panel — click the Security tab before asserting its form.
- **Tag chips** open a `UPopover` (View/Edit/Delete); the chip itself doesn't navigate.
- **Move toolbar** needs ≥1 selected **and** ≥2 active wallets (seed via `createWalletViaApi`).
- Nickname check = **1000ms** debounce; wallet create/edit redirect ≈ **1000ms** after success.
- Charge submit / wallet edit are **disabled until the account email is confirmed**
  (tooltip `emailConfirmRequired`).
