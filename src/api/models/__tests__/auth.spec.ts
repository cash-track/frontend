import { describe, it, expect } from 'vitest'
import { AuthResponse, EmailConfirmation } from '../auth'

describe('AuthResponse.from', () => {
    const raw = {
        data: { type: 'user', id: 42 },
        accessToken: 'acc.tok',
        accessTokenExpiredAt: '2024-06-01T01:00:00Z',
        refreshToken: 'ref.tok',
        refreshTokenExpiredAt: '2024-06-08T00:00:00Z',
    }

    it('parses all fields', () => {
        const a = AuthResponse.from(raw)
        expect(a.data.id).toBe(42)
        expect(a.data.type).toBe('user')
        expect(a.accessToken).toBe('acc.tok')
        expect(a.accessTokenExpiredAt).toBeInstanceOf(Date)
        expect(a.refreshTokenExpiredAt).toBeInstanceOf(Date)
    })

    it('throws on missing data field', () => {
        expect(() => AuthResponse.from({ ...raw, data: undefined })).toThrow('missing data field')
    })

    it('throws on non-object', () => {
        expect(() => AuthResponse.from(null)).toThrow('expected object')
    })
})

describe('EmailConfirmation.from', () => {
    const raw = {
        email: 'alice@example.com',
        createdAt: '2024-06-01T00:00:00Z',
        resendTimeLimit: 60,
        validTimeLimit: 3600,
        timeSentAgo: 120,
        isThrottled: false,
        isValid: true,
    }

    it('parses all fields', () => {
        const ec = EmailConfirmation.from(raw)
        expect(ec.email).toBe('alice@example.com')
        expect(ec.resendTimeLimit).toBe(60)
        expect(ec.isThrottled).toBe(false)
        expect(ec.isValid).toBe(true)
        expect(ec.createdAt).toBeInstanceOf(Date)
    })

    it('throws on missing isValid', () => {
        expect(() => EmailConfirmation.from({ ...raw, isValid: undefined })).toThrow('"isValid"')
    })
})
