import * as Sentry from '@sentry/vue'
import type { ErrorEvent, EventHint } from '@sentry/vue'
import type { App } from 'vue'
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

export function initSentry(app: App): void {
    const dsn = getEnv('VITE_SENTRY_DSN')
    if (dsn === '') return

    const version = getEnv('VITE_APP_VERSION')
    Sentry.init({
        app,
        dsn,
        release: version ? `frontend@${version}` : undefined,
        // Errors only; Tempo owns tracing.
        tracesSampleRate: 0,
        // sentry-trace/baggage headers would fail the gateway's CORS preflight.
        tracePropagationTargets: [],
        ignoreErrors: IGNORED_ERRORS,
        beforeSend: tagTraceId,
    })
}
