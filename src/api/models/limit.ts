import { requireNumber, requireString } from './_validators'
import { Tag } from './tag'
import { WalletShort } from './wallet'

export class Limit {
    readonly id: number
    readonly operation: '+' | '-'
    readonly amount: number
    readonly walletId: number
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly tags: Tag[]
    readonly wallet: WalletShort | null

    constructor(data: {
        id: number
        operation: '+' | '-'
        amount: number
        walletId: number
        createdAt: Date
        updatedAt: Date
        tags: Tag[]
        wallet: WalletShort | null
    }) {
        this.id = data.id
        this.operation = data.operation
        this.amount = data.amount
        this.walletId = data.walletId
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
        this.tags = data.tags
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
            tags: Array.isArray(d.tags) ? d.tags.map(Tag.from) : [],
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
