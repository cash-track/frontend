# Frontend

[![quality](https://github.com/cash-track/frontend/actions/workflows/quality.yml/badge.svg)](https://github.com/cash-track/frontend/actions/workflows/quality.yml) 

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
