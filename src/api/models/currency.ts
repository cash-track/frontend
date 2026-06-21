import { requireNumber, requireString } from './_validators'

export class Currency {
    readonly id: string
    readonly code: string
    readonly name: string
    readonly char: string
    readonly rate: number
    readonly updatedAt: Date

    constructor(data: {
        id: string
        code: string
        name: string
        char: string
        rate: number
        updatedAt: Date
    }) {
        this.id = data.id
        this.code = data.code
        this.name = data.name
        this.char = data.char
        this.rate = data.rate
        this.updatedAt = data.updatedAt
    }

    static from(raw: unknown): Currency {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Currency.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new Currency({
            id: requireString(d, 'id'),
            code: requireString(d, 'code'),
            name: requireString(d, 'name'),
            char: requireString(d, 'char'),
            rate: requireNumber(d, 'rate'),
            updatedAt: new Date(requireString(d, 'updatedAt')),
        })
    }
}
