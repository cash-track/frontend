import { requireBoolean, requireNumber, requireString } from './_validators'

export class AuthResponse {
    readonly data: { type: string; id: number }
    readonly accessToken: string
    readonly accessTokenExpiredAt: Date
    readonly refreshToken: string
    readonly refreshTokenExpiredAt: Date

    constructor(data: {
        data: { type: string; id: number }
        accessToken: string
        accessTokenExpiredAt: Date
        refreshToken: string
        refreshTokenExpiredAt: Date
    }) {
        this.data = data.data
        this.accessToken = data.accessToken
        this.accessTokenExpiredAt = data.accessTokenExpiredAt
        this.refreshToken = data.refreshToken
        this.refreshTokenExpiredAt = data.refreshTokenExpiredAt
    }

    static from(raw: unknown): AuthResponse {
        if (!raw || typeof raw !== 'object') {
            throw new Error('AuthResponse.from: expected object')
        }
        const d = raw as Record<string, unknown>
        if (!d.data || typeof d.data !== 'object') {
            throw new Error('AuthResponse.from: missing data field')
        }
        const identity = d.data as Record<string, unknown>
        return new AuthResponse({
            data: {
                type: typeof identity.type === 'string' ? identity.type : 'user',
                id: requireNumber(identity, 'id'),
            },
            accessToken: requireString(d, 'accessToken'),
            accessTokenExpiredAt: new Date(requireString(d, 'accessTokenExpiredAt')),
            refreshToken: requireString(d, 'refreshToken'),
            refreshTokenExpiredAt: new Date(requireString(d, 'refreshTokenExpiredAt')),
        })
    }
}

export class EmailConfirmation {
    readonly email: string
    readonly createdAt: Date
    readonly resendTimeLimit: number
    readonly validTimeLimit: number
    readonly timeSentAgo: number
    readonly isThrottled: boolean
    readonly isValid: boolean

    constructor(data: {
        email: string
        createdAt: Date
        resendTimeLimit: number
        validTimeLimit: number
        timeSentAgo: number
        isThrottled: boolean
        isValid: boolean
    }) {
        this.email = data.email
        this.createdAt = data.createdAt
        this.resendTimeLimit = data.resendTimeLimit
        this.validTimeLimit = data.validTimeLimit
        this.timeSentAgo = data.timeSentAgo
        this.isThrottled = data.isThrottled
        this.isValid = data.isValid
    }

    static from(raw: unknown): EmailConfirmation {
        if (!raw || typeof raw !== 'object') {
            throw new Error('EmailConfirmation.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new EmailConfirmation({
            email: requireString(d, 'email'),
            createdAt: new Date(requireString(d, 'createdAt')),
            resendTimeLimit: requireNumber(d, 'resendTimeLimit'),
            validTimeLimit: requireNumber(d, 'validTimeLimit'),
            timeSentAgo: requireNumber(d, 'timeSentAgo'),
            isThrottled: requireBoolean(d, 'isThrottled'),
            isValid: requireBoolean(d, 'isValid'),
        })
    }
}
