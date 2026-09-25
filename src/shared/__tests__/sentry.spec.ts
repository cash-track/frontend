import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { App } from 'vue'
import type { ErrorEvent } from '@sentry/vue'

vi.mock('@sentry/vue', () => ({ init: vi.fn() }))

import * as Sentry from '@sentry/vue'
import { initSentry, tagTraceId, IGNORED_ERRORS } from '../sentry'

const app = {} as App

describe('initSentry', () => {
    beforeEach(() => vi.mocked(Sentry.init).mockClear())
    afterEach(() => { delete window.__APP_CONFIG__ })

    it('does nothing without a DSN', () => {
        window.__APP_CONFIG__ = { VITE_SENTRY_DSN: '' }
        // A developer's .env DSN would otherwise win via the import.meta.env fallback.
        vi.stubEnv('VITE_SENTRY_DSN', '')
        initSentry(app)
        expect(Sentry.init).not.toHaveBeenCalled()
        vi.unstubAllEnvs()
    })

    it('inits errors-only with no trace propagation to the gateway', () => {
        window.__APP_CONFIG__ = {
            VITE_SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1',
            VITE_APP_VERSION: 'v2.3.0',
        }
        initSentry(app)
        expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
            app,
            dsn: 'https://key@o1.ingest.sentry.io/1',
            release: 'frontend@v2.3.0',
            environment: import.meta.env.MODE,
            tracesSampleRate: 0,
            tracePropagationTargets: [],
            ignoreErrors: IGNORED_ERRORS,
            beforeSend: tagTraceId,
        }))
    })

    it('leaves release unset without a version', () => {
        window.__APP_CONFIG__ = { VITE_SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1', VITE_APP_VERSION: '' }
        initSentry(app)
        expect(vi.mocked(Sentry.init).mock.calls[0]?.[0]?.release).toBeUndefined()
    })
})

describe('tagTraceId', () => {
    it('tags the gateway trace id carried by API errors', () => {
        const error = Object.assign(new Error('x'), { ctTraceId: 'abc123' })
        const event = tagTraceId({ tags: { a: '1' }, type: undefined } as ErrorEvent, { originalException: error })
        expect(event.tags).toEqual({ a: '1', trace_id: 'abc123' })
    })

    it('leaves events without a trace id untouched', () => {
        const event = tagTraceId({ type: undefined } as ErrorEvent, { originalException: new Error('x') })
        expect(event.tags).toBeUndefined()
    })
})
