# Frontend

[![quality](https://github.com/cash-track/frontend/actions/workflows/quality.yml/badge.svg)](https://github.com/cash-track/frontend/actions/workflows/quality.yml) [![codecov](https://codecov.io/gh/cash-track/frontend/graph/badge.svg)](https://codecov.io/gh/cash-track/frontend)

Static resources and frontend code for Cash Track web interface.

## Push to registry

```bash
$ docker build . -t cashtrack/frontend:latest --no-cache
$ docker push cashtrack/frontend:latest
```

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

### Run your unit tests
```
npm run test:unit
```

### Run unit tests with coverage
```
npm run test:coverage
```

Writes an `lcov` report to `coverage/` (gitignored) and prints a summary. CI runs the same
thing through `npm run test:ci` and uploads `coverage/lcov.info` to
[Codecov](https://codecov.io/gh/cash-track/frontend).

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Icons

Icons are **embedded into the bundle at build time** — the app never calls
`api.iconify.design` or any other third-party icon endpoint at runtime. Two things make that
true, and both live in `vite.config.ts`:

- `ui({ icon: { clientBundle: { scan: … } } })` scans `src/` and bakes every referenced icon
  into the JS bundle.
- `@iconify/vue` is aliased to `src/shared/iconify-offline.ts`, a shim over
  `@iconify/vue/offline`, which contains no HTTP code at all. There is no network fallback to
  fall back *to*.

### Collections you may use

Only these three are installed. An icon from any other collection resolves to **nothing** —
no request, no console error, just an empty element.

| Collection | Prefix | Icons available | Browse | Notes |
|---|---|---|---|---|
| Lucide | `i-lucide-*` | 1756 | [lucide.dev/icons](https://lucide.dev/icons/) | **The default — use this.** Nuxt UI's own components use it too. |
| Heroicons | `i-heroicons-*` | 1288 | [heroicons.com](https://heroicons.com/) | Vue 2 migration leftover, used only by `AppHeader.vue` (4 icons). Don't reach for it in new code. |
| Simple Icons | `simple-icons:*` | 3450 | [simpleicons.org](https://simpleicons.org/) | Brand logos. Used for exactly one icon (`simple-icons:telegram`). |

Adding a fourth collection means installing its data package first:

```bash
npm i -D @iconify-json/<collection>
```

### How the scan works, and where it doesn't

The scanner is a regex over source text — `\b(?:i-)?(lucide|heroicons|…)[:-]([a-z0-9-]+)\b`
— run over every file matching `src/**/*` except `__tests__/`. Consequences:

- **Any literal icon name is picked up automatically.** Template, `.ts`, i18n messages —
  location doesn't matter, only that the name appears verbatim. No config change needed when
  you add one.
- **The dev server does not need a restart.** The plugin re-scans the changed file on save and
  reloads the icon module.
- **Dynamically built names are invisible.** `` :name="`i-lucide-${dir}`" `` or
  `icon: iconMap[key]` never match the regex, so those icons are not embedded — and with no
  network fallback they render as nothing. Keep the full name literal:

  ```ts
  const icon = isUp ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
  ```

  If a literal genuinely isn't possible, list the icon explicitly instead:

  ```ts
  ui({ icon: { clientBundle: { icons: ['lucide:arrow-up'], scan: { … } } } })
  ```

  Explicitly-listed icons also fail *loudly* — an unresolvable one throws at build time.

### The guard test

A **scanned** icon that can't be resolved is dropped silently: `resolveBundleIcons` reports
only explicitly-listed icons in `failed`, so a typo or an uninstalled collection produces no
warning and no build error. `src/__tests__/icons.spec.ts` closes that gap — it re-runs the
scan and feeds the results back in as `icons` rather than `scannedIcons`, which turns every
unresolvable name into a test failure. **Don't delete it**; if it fails, the icon you just
added would have shipped blank.

### Budget

The client bundle is currently **74 icons / ~20 KB** (69 lucide — 41 from app code, the rest
Nuxt UI component defaults — plus 4 heroicons and 1 simple-icons). The plugin warns at 192 KB
and hard-fails the build at 256 KB, so there is room for hundreds more.
