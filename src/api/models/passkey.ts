import { requireNumber, requireString, optionalDate } from './_validators'

export class Passkey {
    readonly id: number
    readonly name: string
    readonly createdAt: Date
    readonly usedAt: Date | null

    constructor(data: {
        id: number
        name: string
        createdAt: Date
        usedAt: Date | null
    }) {
        this.id = data.id
        this.name = data.name
        this.createdAt = data.createdAt
        this.usedAt = data.usedAt
    }

    static from(raw: unknown): Passkey {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Passkey.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new Passkey({
            id: requireNumber(d, 'id'),
            name: requireString(d, 'name'),
            createdAt: new Date(requireString(d, 'createdAt')),
            usedAt: optionalDate(d, 'usedAt'),
        })
    }
}
