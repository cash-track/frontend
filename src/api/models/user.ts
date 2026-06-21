import { requireBoolean, requireNumber, requireString, optionalString } from './_validators'
import { Currency } from './currency'

export class UserShort {
    readonly id: number
    readonly name: string
    readonly lastName: string | null
    readonly nickName: string
    readonly photoUrl: string | null

    constructor(data: {
        id: number
        name: string
        lastName: string | null
        nickName: string
        photoUrl: string | null
    }) {
        this.id = data.id
        this.name = data.name
        this.lastName = data.lastName
        this.nickName = data.nickName
        this.photoUrl = data.photoUrl
    }

    static from(raw: unknown): UserShort {
        if (!raw || typeof raw !== 'object') {
            throw new Error('UserShort.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new UserShort({
            id: requireNumber(d, 'id'),
            name: requireString(d, 'name'),
            lastName: optionalString(d, 'lastName'),
            nickName: requireString(d, 'nickName'),
            photoUrl: optionalString(d, 'photoUrl'),
        })
    }

    get displayName(): string {
        return this.lastName ? `${this.name} ${this.lastName}` : this.name
    }
}

export class User {
    readonly id: number
    readonly name: string
    readonly lastName: string | null
    readonly nickName: string
    readonly email: string
    readonly isEmailConfirmed: boolean
    readonly photoUrl: string | null
    readonly defaultCurrencyCode: string | null
    readonly defaultCurrency: Currency | null
    readonly locale: string
    readonly createdAt: Date
    readonly updatedAt: Date

    constructor(data: {
        id: number
        name: string
        lastName: string | null
        nickName: string
        email: string
        isEmailConfirmed: boolean
        photoUrl: string | null
        defaultCurrencyCode: string | null
        defaultCurrency: Currency | null
        locale: string
        createdAt: Date
        updatedAt: Date
    }) {
        this.id = data.id
        this.name = data.name
        this.lastName = data.lastName
        this.nickName = data.nickName
        this.email = data.email
        this.isEmailConfirmed = data.isEmailConfirmed
        this.photoUrl = data.photoUrl
        this.defaultCurrencyCode = data.defaultCurrencyCode
        this.defaultCurrency = data.defaultCurrency
        this.locale = data.locale
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }

    static from(raw: unknown): User {
        if (!raw || typeof raw !== 'object') {
            throw new Error('User.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new User({
            id: requireNumber(d, 'id'),
            name: requireString(d, 'name'),
            lastName: optionalString(d, 'lastName'),
            nickName: requireString(d, 'nickName'),
            email: requireString(d, 'email'),
            isEmailConfirmed: requireBoolean(d, 'isEmailConfirmed'),
            photoUrl: optionalString(d, 'photoUrl'),
            defaultCurrencyCode: optionalString(d, 'defaultCurrencyCode'),
            defaultCurrency: d.defaultCurrency ? Currency.from(d.defaultCurrency) : null,
            locale: requireString(d, 'locale'),
            createdAt: new Date(requireString(d, 'createdAt')),
            updatedAt: new Date(requireString(d, 'updatedAt')),
        })
    }

    get displayName(): string {
        return this.lastName ? `${this.name} ${this.lastName}` : this.name
    }
}
