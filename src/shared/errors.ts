import { AxiosError } from 'axios'

/**
 * Formats an error into a short, copy-pasteable, metadata-only string.
 * No response bodies, no headers, no tokens, no PII — only structural metadata.
 */
export function describeError(error: unknown): string {
    const at = new Date().toISOString()
    const rawTraceId = (error as Record<string, unknown> | null)?.ctTraceId
    const traceLine = typeof rawTraceId === 'string' && rawTraceId.length > 0 ? `traceId=${rawTraceId}` : null

    if (error instanceof AxiosError) {
        const parts = [
            error.response ? `HTTP ${error.response.status}` : 'No response (network/timeout)',
            error.code ? `code=${error.code}` : null,
            error.config?.method ? `${error.config.method.toUpperCase()} ${error.config.url ?? ''}`.trim() : null,
            error.message ? `msg=${error.message}` : null,
            traceLine,
        ].filter(Boolean)
        return `${at}\n${parts.join('\n')}`
    }
    if (error instanceof Error) {
        const parts = [`${error.name}: ${error.message}`, traceLine].filter(Boolean)
        return `${at}\n${parts.join('\n')}`
    }
    return `${at}\n${String(error)}`
}
