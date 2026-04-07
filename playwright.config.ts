import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
// Allow overriding the base URL for testing against real dev stack
const baseURL = process.env.E2E_BASE_URL
    ?? (isCI ? 'http://localhost:4173' : 'https://my.dev-cash-track.app')

export default defineConfig({
    testDir: './e2e',
    timeout: 30 * 1000,
    expect: {
        timeout: 5000,
    },
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    reporter: 'html',

    globalSetup: './e2e/setup/global-setup.ts',

    use: {
        actionTimeout: 0,
        baseURL,
        storageState: 'e2e/setup/.auth.json',
        trace: 'on-first-retry',
        headless: isCI,
        ignoreHTTPSErrors: true,
    },

    projects: [
        {
            name: 'setup',
            testMatch: /global-setup\.ts/,
        },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
    ],

    webServer: isCI
        ? {
              command: 'npm run preview',
              port: 4173,
              reuseExistingServer: false,
          }
        : undefined,
})
