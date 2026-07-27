/**
 * Offline drop-in for `@iconify/vue` (issue #122).
 *
 * `vite.config.ts` aliases `@iconify/vue` here so the app can never reach
 * api.iconify.design: the offline entry ships `Icon` + `addIcon` with no HTTP
 * code at all, and every icon we use is embedded at build time by Nuxt UI's
 * `icon.clientBundle`.
 *
 * The one thing the offline entry does differently is name resolution. Its
 * `storage` is a flat map keyed by the exact string passed to `addIcon`, while
 * the online entry normalises through `stringToIcon()` and therefore treats
 * `lucide:calendar` and `lucide-calendar` as the same icon. Nuxt UI relies on
 * that: its icons plugin registers `lucide:calendar` (colon), but `UIcon`
 * strips the `i-` prefix and asks `IconifyIcon` for `lucide-calendar` (dash).
 * Against the raw offline entry every such lookup misses and the icon renders
 * as nothing — a zero-width button, not an error.
 *
 * So `addIcon` below registers both spellings. Nuxt UI already does this for
 * hyphenated prefixes (`simple-icons:telegram` → `simple-icons-telegram`);
 * this covers the ordinary prefixes it leaves alone.
 */
import { Icon, addCollection, addIcon as addIconExact } from '@iconify/vue/offline'
import type { IconifyIcon } from '@iconify/vue/offline'

export function addIcon(name: string, data: IconifyIcon): void {
    addIconExact(name, data)

    const colon = name.indexOf(':')
    if (colon !== -1) {
        addIconExact(`${name.slice(0, colon)}-${name.slice(colon + 1)}`, data)
    }
}

export { Icon, addCollection }
