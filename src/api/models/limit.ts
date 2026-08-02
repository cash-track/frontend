import { requireNumber, requireString } from './_validators'
import { Tag } from './tag'
import { WalletShort } from './wallet'

export class LimitTagGroup {
    readonly connection: 'and' | 'or'
    readonly tags: Tag[]

    constructor(data: { connection: 'and' | 'or'; tags: Tag[] }) {
        this.connection = data.connection
        this.tags = data.tags
    }

    static from(raw: unknown): LimitTagGroup {
        if (!raw || typeof raw !== 'object') {
            throw new Error('LimitTagGroup.from: expected object')
        }
        const d = raw as Record<string, unknown>

        const connection = requireString(d, 'connection')
        if (connection !== 'and' && connection !== 'or') {
            throw new Error(`LimitTagGroup.from: invalid connection "${connection}"`)
        }

        return new LimitTagGroup({
            connection,
            tags: Array.isArray(d.tags) ? d.tags.map(Tag.from) : [],
        })
    }
}

export class Limit {
    readonly id: number
    readonly operation: '+' | '-'
    readonly amount: number
    readonly walletId: number
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly tagGroups: LimitTagGroup[]
    readonly wallet: WalletShort | null

    constructor(data: {
        id: number
        operation: '+' | '-'
        amount: number
        walletId: number
        createdAt: Date
        updatedAt: Date
        tagGroups: LimitTagGroup[]
        wallet: WalletShort | null
    }) {
        this.id = data.id
        this.operation = data.operation
        this.amount = data.amount
        this.walletId = data.walletId
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
        this.tagGroups = data.tagGroups
        this.wallet = data.wallet
    }

    static from(raw: unknown): Limit {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Limit.from: expected object')
        }
        const d = raw as Record<string, unknown>

        const op = requireString(d, 'operation')
        if (op !== '+' && op !== '-') {
            throw new Error(`Limit.from: invalid operation "${op}"`)
        }

        return new Limit({
            id: requireNumber(d, 'id'),
            operation: op,
            amount: requireNumber(d, 'amount'),
            walletId: requireNumber(d, 'walletId'),
            createdAt: new Date(requireString(d, 'createdAt')),
            updatedAt: new Date(requireString(d, 'updatedAt')),
            tagGroups: Array.isArray(d.tagGroups) ? d.tagGroups.map(LimitTagGroup.from) : [],
            wallet: d.wallet ? WalletShort.from(d.wallet) : null,
        })
    }
}

export class WalletLimit {
    readonly amount: number
    readonly percentage: number
    readonly limit: Limit

    constructor(data: { amount: number; percentage: number; limit: Limit }) {
        this.amount = data.amount
        this.percentage = data.percentage
        this.limit = data.limit
    }

    get isExceeded(): boolean {
        return this.percentage > 100
    }

    static from(raw: unknown): WalletLimit {
        if (!raw || typeof raw !== 'object') {
            throw new Error('WalletLimit.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new WalletLimit({
            amount: requireNumber(d, 'amount'),
            percentage: requireNumber(d, 'percentage'),
            limit: Limit.from(d.limit),
        })
    }
}
