import { describe, it, expect } from 'vitest'
import { getEmojiFromString, parseTagInput } from '../strings'

describe('getEmojiFromString', () => {
    it('returns empty string when no emoji present', () => {
        expect(getEmojiFromString('Food')).toBe('')
    })

    it('extracts leading emoji', () => {
        expect(getEmojiFromString('🥦 Food')).toBeTruthy()
    })

    it('returns empty string for plain text', () => {
        expect(getEmojiFromString('hello world')).toBe('')
    })
})

describe('parseTagInput', () => {
    it('returns name with no icon for plain text', () => {
        expect(parseTagInput('Food')).toEqual({ icon: null, name: 'Food' })
    })

    it('extracts leading emoji as icon and trims remaining name', () => {
        const result = parseTagInput('🥦 Food')
        expect(result.icon).toBeTruthy()
        expect(result.name).toBe('Food')
    })

    it('trims whitespace from name when no emoji', () => {
        expect(parseTagInput('  Food  ')).toEqual({ icon: null, name: 'Food' })
    })

    it('trims name after emoji', () => {
        const result = parseTagInput('🥦   Food  ')
        expect(result.name).toBe('Food')
    })

    it('returns empty name when input is only emoji', () => {
        const result = parseTagInput('🥦')
        expect(result.icon).toBeTruthy()
        expect(result.name).toBe('')
    })

    it('returns empty name and no icon for empty input', () => {
        expect(parseTagInput('')).toEqual({ icon: null, name: '' })
    })

    it('does not treat mid-string emoji as icon', () => {
        const result = parseTagInput('Food 🥦')
        expect(result.icon).toBeNull()
        expect(result.name).toBe('Food 🥦')
    })
})
