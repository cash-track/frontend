import { describe, it, expect } from 'vitest'
import { Tag } from '../tag'

const tagRaw = {
    id: 3,
    name: 'food',
    icon: '🍔',
    color: '#FF5733',
    userId: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
}

describe('Tag.from', () => {
    it('parses all fields', () => {
        const t = Tag.from(tagRaw)
        expect(t.id).toBe(3)
        expect(t.name).toBe('food')
        expect(t.icon).toBe('🍔')
        expect(t.color).toBe('#FF5733')
        expect(t.userId).toBe(1)
        expect(t.createdAt).toBeInstanceOf(Date)
    })

    it('parses null icon and color', () => {
        const t = Tag.from({ ...tagRaw, icon: null, color: null })
        expect(t.icon).toBeNull()
        expect(t.color).toBeNull()
    })

    it('throws on missing name', () => {
        expect(() => Tag.from({ ...tagRaw, name: undefined })).toThrow('"name"')
    })
})
