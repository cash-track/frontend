import { describe, it, expect } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { describeError } from '../errors'

function makeTransportAxiosError(code: string, method: string, url: string): AxiosError {
    const err = new AxiosError('transport failure', code)
    err.config = { method, url } as InternalAxiosRequestConfig
    // no response — transport error
    return err
}

function makeHttpAxiosError(status: number): AxiosError {
    const err = new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE')
    err.response = { status } as AxiosResponse
    err.config = { method: 'get', url: '/api/wallets' } as InternalAxiosRequestConfig
    return err
}

describe('describeError', () => {
    it('formats transport AxiosError — contains No response, code, method+url, msg', () => {
        const err = makeTransportAxiosError('ECONNABORTED', 'get', '/api/wallets/unarchived')
        const result = describeError(err)
        expect(result).toContain('No response (network/timeout)')
        expect(result).toContain('code=ECONNABORTED')
        expect(result).toContain('GET /api/wallets/unarchived')
        expect(result).toContain('msg=transport failure')
        // should also include an ISO timestamp on the first line
        expect(result.split('\n')[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('formats HTTP AxiosError with response — contains HTTP status', () => {
        const err = makeHttpAxiosError(500)
        const result = describeError(err)
        expect(result).toContain('HTTP 500')
        expect(result).not.toContain('No response')
    })

    it('formats plain Error — contains name and message', () => {
        const err = new Error('something went wrong')
        const result = describeError(err)
        expect(result).toContain('Error: something went wrong')
        expect(result.split('\n')[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('formats non-error value — uses String()', () => {
        const result = describeError('raw string error')
        expect(result).toContain('raw string error')
        expect(result.split('\n')[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('formats null — uses String(null)', () => {
        const result = describeError(null)
        expect(result).toContain('null')
    })

    it('includes traceId line when ctTraceId is present on an AxiosError', () => {
        const err = makeHttpAxiosError(500)
        Object.assign(err, { ctTraceId: 'abc123trace' })
        const result = describeError(err)
        expect(result).toContain('traceId=abc123trace')
    })

    it('omits traceId line when ctTraceId is absent on an AxiosError', () => {
        const err = makeHttpAxiosError(500)
        const result = describeError(err)
        expect(result).not.toContain('traceId=')
    })

    it('includes traceId line when ctTraceId is present on a plain Error', () => {
        const err = new Error('parser failed')
        Object.assign(err, { ctTraceId: 'def456trace' })
        const result = describeError(err)
        expect(result).toContain('traceId=def456trace')
    })

    it('omits traceId line when ctTraceId is absent on a plain Error', () => {
        const err = new Error('parser failed')
        const result = describeError(err)
        expect(result).not.toContain('traceId=')
    })
})
