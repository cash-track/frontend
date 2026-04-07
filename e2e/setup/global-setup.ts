import { chromium } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { config as dotenvConfig } from 'dotenv'

const AUTH_FILE = path.join(import.meta.dirname, '.auth.json')

// Load .env.local for test credentials (not committed)
dotenvConfig({ path: path.resolve(import.meta.dirname, '../../.env.local'), override: false })

const GATEWAY_URL = process.env.E2E_GATEWAY_URL ?? 'https://gateway.dev-cash-track.app'
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

export default async function globalSetup() {
    if (!EMAIL || !PASSWORD) {
        console.warn(
            '[e2e] No credentials found. Set E2E_EMAIL and E2E_PASSWORD in environment or .env.local. ' +
            'Authenticated tests will fail.',
        )
        fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
        return
    }

    const browser = await chromium.launch()
    const context = await browser.newContext({ ignoreHTTPSErrors: true })

    // Login via gateway — sets HttpOnly auth cookies on .dev-cash-track.app domain
    const response = await context.request.post(`${GATEWAY_URL}/api/auth/login`, {
        data: { email: EMAIL, password: PASSWORD, remember: true },
        headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok()) {
        throw new Error(`Login failed with status ${response.status()}: ${await response.text()}`)
    }

    await context.storageState({ path: AUTH_FILE })
    await browser.close()
    console.log('[e2e] Auth cookies saved.')
}
