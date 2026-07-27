import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Icon, addIcon } from '@/shared/iconify-offline'

// A minimal but valid icon body — enough for @iconify/vue to render an <svg>.
const square = { body: '<rect width="24" height="24" />', width: 24, height: 24 }

const renderIcon = (name: string) => mount(Icon, { props: { icon: name } }).html()

describe('iconify-offline shim', () => {
    it('renders an icon registered under its colon name', () => {
        addIcon('lucide:calendar', square)

        expect(renderIcon('lucide:calendar')).toContain('<svg')
    })

    it('renders the same icon under the dash name UIcon asks for', () => {
        // UIcon turns `i-lucide-calendar` into `lucide-calendar`. The raw offline
        // entry keys storage by the exact string, so without the shim this misses
        // and the icon silently renders as nothing.
        addIcon('lucide:calendar', square)

        expect(renderIcon('lucide-calendar')).toContain('<svg')
    })

    it('keeps working for hyphenated collections', () => {
        addIcon('simple-icons:telegram', square)

        expect(renderIcon('simple-icons:telegram')).toContain('<svg')
        expect(renderIcon('simple-icons-telegram')).toContain('<svg')
    })

    it('renders nothing for an icon that was never registered', () => {
        expect(renderIcon('lucide-not-bundled')).not.toContain('<svg')
    })
})
