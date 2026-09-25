import * as Sentry from '@sentry/vue'
import type { ErrorEvent, EventHint } from '@sentry/vue'
import type { App } from 'vue'
import { AxiosError } from 'axios'
import { getEnv } from '@/shared/env'

// Handled flows and browser noise, not bugs.
export const IGNORED_ERRORS: (string | RegExp)[] = [
    'CsrfError',
    'ResizeObserver loop',
    /^Network Error$/,
    /^canceled$/,
]

// ctTraceId is set by apiCall() from the gateway's X-Ct-Trace-Id header.
export function tagTraceId(event: ErrorEvent, hint: EventHint): ErrorEvent {
    const traceId = (hint.originalException as { ctTraceId?: unknown } | null)?.ctTraceId
    if (typeof traceId === 'string' && traceId !== '') {
        event.tags = { ...event.tags, trace_id: traceId }
    }
    return event
}

// Expected outcomes, not bugs: the 417 CSRF flow (matched by name to avoid an import cycle
// with api/client) and WebAuthn outcomes caused by the user or their authenticator.
const EXPECTED_ERROR_NAMES = new Set(['CsrfError', 'NotAllowedError', 'AbortError', 'InvalidStateError'])

/**
 * 5xx, timeouts and non-HTTP exceptions are bugs. 4xx, CSRF, user cancels and connectivity
 * drops (ERR_NETWORK: offline clients; server outages are alerted server-side) are not.
 */
export function isReportable(error: unknown): boolean {
    if (error instanceof AxiosError) {
        if (error.response) return error.response.status >= 500
        return error.code !== AxiosError.ERR_CANCELED && error.code !== AxiosError.ERR_NETWORK
    }
    if (error instanceof Error && EXPECTED_ERROR_NAMES.has(error.name)) return false
    return true
}

/**
 * Reports a caught error to Sentry when it is unexpected. Safe to call more than once for
 * the same error: Sentry skips an exception object it has already captured.
 */
export function reportError(error: unknown): void {
    if (!isReportable(error)) return
    if (import.meta.env.DEV) console.error(error)
    Sentry.captureException(error)
}

export function initSentry(app: App): void {
    const dsn = getEnv('VITE_SENTRY_DSN')
    if (dsn === '') return

    const version = getEnv('VITE_APP_VERSION')
    Sentry.init({
        app,
        dsn,
        release: version ? `frontend@${version}` : undefined,
        // 'development' under the Vite dev server, 'production' in built images.
        environment: import.meta.env.MODE,
        // Errors only; Tempo owns tracing.
        tracesSampleRate: 0,
        // sentry-trace/baggage headers would fail the gateway's CORS preflight.
        tracePropagationTargets: [],
        ignoreErrors: IGNORED_ERRORS,
        beforeSend: tagTraceId,
    })
}
