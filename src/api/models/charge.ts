import { requireNumber, requireString, optionalString } from './_validators'
import { UserShort } from './user'
import { Tag } from './tag'
import { Currency } from './currency'
// WalletShort lives in wallet.ts which in turn imports Charge — a circular ESM reference.
// This is safe: both modules only reference each other inside method bodies (never at
// top-level init time), so all exports are fully initialised before any .from() is called.
import { WalletShort } from './wallet'

export class Charge {
    readonly id: string
    readonly operation: '+' | '-'
    readonly amount: number
    readonly title: string
    readonly description: string | null
    readonly userId: number
    readonly walletId: number
    readonly dateTime: Date
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly user: UserShort | null
    readonly tags: Tag[]
    readonly wallet: WalletShort | null

    constructor(data: {
        id: string
        operation: '+' | '-'
        amount: number
        title: string
        description: string | null
        userId: number
        walletId: number
        dateTime: Date
        createdAt: Date
        updatedAt: Date
        user: UserShort | null
        tags: Tag[]
        wallet: WalletShort | null
    }) {
        this.id = data.id
        this.operation = data.operation
        this.amount = data.amount
        this.title = data.title
        this.description = data.description
        this.userId = data.userId
        this.walletId = data.walletId
        this.dateTime = data.dateTime
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
        this.user = data.user
        this.tags = data.tags
        this.wallet = data.wallet
    }

    static from(raw: unknown): Charge {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Charge.from: expected object')
        }
        const d = raw as Record<string, unknown>

        const op = requireString(d, 'operation')
        if (op !== '+' && op !== '-') {
            throw new Error(`Charge.from: invalid operation "${op}"`)
        }

        return new Charge({
            id: requireString(d, 'id'),
            operation: op,
            amount: requireNumber(d, 'amount'),
            title: requireString(d, 'title'),
            description: optionalString(d, 'description'),
            userId: requireNumber(d, 'userId'),
            walletId: requireNumber(d, 'walletId'),
            dateTime: new Date(requireString(d, 'dateTime')),
            createdAt: new Date(requireString(d, 'createdAt')),
            updatedAt: new Date(requireString(d, 'updatedAt')),
            user: d.user ? UserShort.from(d.user) : null,
            tags: Array.isArray(d.tags) ? d.tags.map(Tag.from) : [],
            wallet: d.wallet ? WalletShort.from(d.wallet) : null,
        })
    }
}

export class ChargeTotal {
    readonly totalAmount: number
    readonly totalIncomeAmount: number
    readonly totalExpenseAmount: number
    readonly currency: Currency | null

    constructor(data: {
        totalAmount: number
        totalIncomeAmount: number
        totalExpenseAmount: number
        currency: Currency | null
    }) {
        this.totalAmount = data.totalAmount
        this.totalIncomeAmount = data.totalIncomeAmount
        this.totalExpenseAmount = data.totalExpenseAmount
        this.currency = data.currency
    }

    static from(raw: unknown): ChargeTotal {
        if (!raw || typeof raw !== 'object') {
            throw new Error('ChargeTotal.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new ChargeTotal({
            totalAmount: typeof d.totalAmount === 'number' ? d.totalAmount : 0,
            totalIncomeAmount: typeof d.totalIncomeAmount === 'number' ? d.totalIncomeAmount : 0,
            totalExpenseAmount: typeof d.totalExpenseAmount === 'number' ? d.totalExpenseAmount : 0,
            currency: d.currency ? Currency.from(d.currency) : null,
        })
    }
}

export class ChargeTitleSuggestion {
    readonly title: string
    readonly count: number

    constructor(data: { title: string; count: number }) {
        this.title = data.title
        this.count = data.count
    }

    static from(raw: unknown): ChargeTitleSuggestion {
        if (!raw || typeof raw !== 'object') {
            throw new Error('ChargeTitleSuggestion.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new ChargeTitleSuggestion({
            title: requireString(d, 'title'),
            count: requireNumber(d, 'count'),
        })
    }
}
