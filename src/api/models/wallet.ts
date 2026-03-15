import { requireBoolean, requireNumber, requireString, optionalString } from './_validators'
import { Currency } from './currency'
import { UserShort } from './user'
// Charge lives in charge.ts which imports WalletShort from this file — a circular ESM reference.
// Safe: neither module executes cross-module calls at top-level init time.
import { Charge } from './charge'

export class WalletShort {
    readonly id: number
    readonly name: string
    readonly slug: string
    readonly totalAmount: number
    readonly isActive: boolean
    readonly isPublic: boolean
    readonly isArchived: boolean
    readonly defaultCurrencyCode: string | null
    readonly defaultCurrency: Currency | null
    readonly createdAt: Date
    readonly updatedAt: Date

    constructor(data: {
        id: number
        name: string
        slug: string
        totalAmount: number
        isActive: boolean
        isPublic: boolean
        isArchived: boolean
        defaultCurrencyCode: string | null
        defaultCurrency: Currency | null
        createdAt: Date
        updatedAt: Date
    }) {
        this.id = data.id
        this.name = data.name
        this.slug = data.slug
        this.totalAmount = data.totalAmount
        this.isActive = data.isActive
        this.isPublic = data.isPublic
        this.isArchived = data.isArchived
        this.defaultCurrencyCode = data.defaultCurrencyCode
        this.defaultCurrency = data.defaultCurrency
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }

    static from(raw: unknown): WalletShort {
        if (!raw || typeof raw !== 'object') {
            throw new Error('WalletShort.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new WalletShort({
            id: requireNumber(d, 'id'),
            name: requireString(d, 'name'),
            slug: requireString(d, 'slug'),
            totalAmount: requireNumber(d, 'totalAmount'),
            isActive: requireBoolean(d, 'isActive'),
            isPublic: requireBoolean(d, 'isPublic'),
            isArchived: requireBoolean(d, 'isArchived'),
            defaultCurrencyCode: optionalString(d, 'defaultCurrencyCode'),
            defaultCurrency: d.defaultCurrency ? Currency.from(d.defaultCurrency) : null,
            createdAt: new Date(requireString(d, 'createdAt')),
            updatedAt: new Date(requireString(d, 'updatedAt')),
        })
    }
}

export class Wallet extends WalletShort {
    readonly users: UserShort[]
    readonly latestCharges: Charge[]

    constructor(data: ConstructorParameters<typeof WalletShort>[0] & {
        users: UserShort[]
        latestCharges: Charge[]
    }) {
        super(data)
        this.users = data.users
        this.latestCharges = data.latestCharges
    }

    static from(raw: unknown): Wallet {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Wallet.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new Wallet({
            id: requireNumber(d, 'id'),
            name: requireString(d, 'name'),
            slug: requireString(d, 'slug'),
            totalAmount: requireNumber(d, 'totalAmount'),
            isActive: requireBoolean(d, 'isActive'),
            isPublic: requireBoolean(d, 'isPublic'),
            isArchived: requireBoolean(d, 'isArchived'),
            defaultCurrencyCode: optionalString(d, 'defaultCurrencyCode'),
            defaultCurrency: d.defaultCurrency ? Currency.from(d.defaultCurrency) : null,
            createdAt: new Date(requireString(d, 'createdAt')),
            updatedAt: new Date(requireString(d, 'updatedAt')),
            users: Array.isArray(d.users) ? d.users.map(UserShort.from) : [],
            latestCharges: Array.isArray(d.latestCharges) ? d.latestCharges.map(Charge.from) : [],
        })
    }
}

export interface WalletTotalTag {
    tagId: number
    totalIncomeAmount: number
    totalExpenseAmount: number
}

export class WalletTotal {
    readonly totalAmount: number
    readonly totalIncomeAmount: number
    readonly totalExpenseAmount: number
    readonly tags: WalletTotalTag[]

    constructor(data: {
        totalAmount: number
        totalIncomeAmount: number
        totalExpenseAmount: number
        tags: WalletTotalTag[]
    }) {
        this.totalAmount = data.totalAmount
        this.totalIncomeAmount = data.totalIncomeAmount
        this.totalExpenseAmount = data.totalExpenseAmount
        this.tags = data.tags
    }

    static from(raw: unknown): WalletTotal {
        if (!raw || typeof raw !== 'object') {
            throw new Error('WalletTotal.from: expected object')
        }
        const d = raw as Record<string, unknown>

        const tags: WalletTotalTag[] = []
        if (Array.isArray(d.tags)) {
            for (const t of d.tags) {
                if (t && typeof t === 'object') {
                    const td = t as Record<string, unknown>
                    tags.push({
                        tagId: typeof td.tagId === 'number' ? td.tagId : 0,
                        totalIncomeAmount: typeof td.totalIncomeAmount === 'number' ? td.totalIncomeAmount : 0,
                        totalExpenseAmount: typeof td.totalExpenseAmount === 'number' ? td.totalExpenseAmount : 0,
                    })
                }
            }
        }

        return new WalletTotal({
            totalAmount: typeof d.totalAmount === 'number' ? d.totalAmount : 0,
            totalIncomeAmount: typeof d.totalIncomeAmount === 'number' ? d.totalIncomeAmount : 0,
            totalExpenseAmount: typeof d.totalExpenseAmount === 'number' ? d.totalExpenseAmount : 0,
            tags,
        })
    }
}
