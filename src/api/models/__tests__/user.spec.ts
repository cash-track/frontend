import { describe, it, expect } from 'vitest'
import { User, UserShort } from '../user'

const currencyRaw = {
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: '2024-01-01T00:00:00Z',
}

const userShortRaw = {
    id: 1,
    name: 'Alice',
    lastName: null,
    nickName: 'alice',
    photoUrl: null,
}

const userRaw = {
    id: 1,
    name: 'Alice',
    lastName: 'Smith',
    nickName: 'alice',
    email: 'alice@example.com',
    isEmailConfirmed: true,
    photoUrl: 'https://cdn.example.com/photo.jpg',
    defaultCurrencyCode: 'USD',
    defaultCurrency: currencyRaw,
    locale: 'en',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
}

describe('UserShort.from', () => {
    it('parses all fields', () => {
        const u = UserShort.from(userShortRaw)
        expect(u.id).toBe(1)
        expect(u.name).toBe('Alice')
        expect(u.lastName).toBeNull()
        expect(u.nickName).toBe('alice')
        expect(u.photoUrl).toBeNull()
    })

    it('displayName returns name only when lastName is null', () => {
        expect(UserShort.from(userShortRaw).displayName).toBe('Alice')
    })

    it('displayName includes lastName when present', () => {
        expect(UserShort.from({ ...userShortRaw, lastName: 'Smith' }).displayName).toBe('Alice Smith')
    })

    it('throws on missing id', () => {
        expect(() => UserShort.from({ ...userShortRaw, id: undefined })).toThrow('"id"')
    })
})

describe('User.from', () => {
    it('parses all fields including nested currency', () => {
        const u = User.from(userRaw)
        expect(u.id).toBe(1)
        expect(u.email).toBe('alice@example.com')
        expect(u.isEmailConfirmed).toBe(true)
        expect(u.defaultCurrency?.code).toBe('USD')
        expect(u.locale).toBe('en')
        expect(u.createdAt).toBeInstanceOf(Date)
    })

    it('parses null defaultCurrency', () => {
        const u = User.from({ ...userRaw, defaultCurrency: null, defaultCurrencyCode: null })
        expect(u.defaultCurrency).toBeNull()
        expect(u.defaultCurrencyCode).toBeNull()
    })

    it('displayName includes lastName when present', () => {
        expect(User.from(userRaw).displayName).toBe('Alice Smith')
    })

    it('displayName returns name only when lastName is null', () => {
        expect(User.from({ ...userRaw, lastName: null }).displayName).toBe('Alice')
    })

    it('throws on non-object', () => {
        expect(() => User.from('bad')).toThrow('expected object')
    })
})
