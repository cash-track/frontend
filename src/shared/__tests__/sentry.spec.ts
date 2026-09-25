import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { App } from 'vue'
import type { ErrorEvent } from '@sentry/vue'
import { AxiosError, type AxiosResponse } from 'axios'

vi.mock('@sentry/vue', () => ({ init: vi.fn(), captureException: vi.fn() }))

import * as Sentry from '@sentry/vue'
import { CsrfError } from '@/api/client'
import { initSentry, tagTraceId, isReportable, reportError, IGNORED_ERRORS } from '../sentry'

function httpError(status: number): AxiosError {
    return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status,
    } as AxiosResponse)
}

function named(name: string): Error {
    return Object.assign(new Error(name), { name })
}

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

describe('IGNORED_ERRORS', () => {
    it('drops connectivity noise but not timeouts', () => {
        const matches = (msg: string) => IGNORED_ERRORS.some(p => (typeof p === 'string' ? msg.includes(p) : p.test(msg)))
        expect(matches('Network Error')).toBe(true)
        expect(matches('timeout of 15000ms exceeded')).toBe(false)
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

describe('isReportable', () => {
    it.each([
        ['5xx', httpError(500)],
        ['503', httpError(503)],
        ['timeout', new AxiosError('timeout of 15000ms exceeded', AxiosError.ECONNABORTED)],
        ['plain Error (bug)', new TypeError('x is undefined')],
        ['non-Error value', 'boom'],
    ])('reports %s', (_, error) => {
        expect(isReportable(error)).toBe(true)
    })

    it.each([
        ['401', httpError(401)],
        ['403', httpError(403)],
        ['404', httpError(404)],
        ['409', httpError(409)],
        ['417', httpError(417)],
        ['422', httpError(422)],
        ['CsrfError', new CsrfError(new Error('csrf'))],
        ['network error (offline)', new AxiosError('Network Error', AxiosError.ERR_NETWORK)],
        ['cancelled request', new AxiosError('canceled', AxiosError.ERR_CANCELED)],
        ['WebAuthn NotAllowedError', named('NotAllowedError')],
        ['WebAuthn AbortError', named('AbortError')],
        ['WebAuthn InvalidStateError', named('InvalidStateError')],
    ])('skips %s', (_, error) => {
        expect(isReportable(error)).toBe(false)
    })
})

describe('reportError', () => {
    beforeEach(() => vi.mocked(Sentry.captureException).mockClear())

    it('captures unexpected errors', () => {
        const error = httpError(500)
        reportError(error)
        expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('ignores expected errors', () => {
        reportError(httpError(422))
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })
})
