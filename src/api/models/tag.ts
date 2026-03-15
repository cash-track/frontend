import { requireNumber, requireString, optionalString } from './_validators'

export class Tag {
    readonly id: number
    readonly name: string
    readonly icon: string | null
    readonly color: string | null
    readonly userId: number
    readonly createdAt: Date
    readonly updatedAt: Date

    constructor(data: {
        id: number
        name: string
        icon: string | null
        color: string | null
        userId: number
        createdAt: Date
        updatedAt: Date
    }) {
        this.id = data.id
        this.name = data.name
        this.icon = data.icon
        this.color = data.color
        this.userId = data.userId
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }

    static from(raw: unknown): Tag {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Tag.from: expected object')
        }
        const d = raw as Record<string, unknown>
        return new Tag({
            id: requireNumber(d, 'id'),
            name: requireString(d, 'name'),
            icon: optionalString(d, 'icon'),
            color: optionalString(d, 'color'),
            userId: requireNumber(d, 'userId'),
            createdAt: new Date(requireString(d, 'createdAt')),
            updatedAt: new Date(requireString(d, 'updatedAt')),
        })
    }
}
