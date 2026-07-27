import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { collectionNames, createMatchRegex, resolveBundleIcons } from '@nuxt/icon/utils'

/**
 * Guards the offline icon bundle (issue #122).
 *
 * `vite.config.ts` embeds every icon the app references into the build, and
 * `@iconify/vue` is aliased to its offline entry so nothing can fall back to
 * api.iconify.design. The build resolves scanned icons silently: one from a
 * collection we have not installed is skipped without a warning and then
 * renders as nothing. This test is what turns that into a failure.
 */
// vitest.config.ts pins `root` to the project directory, which is also the cwd.
// import.meta.url is not usable here — under jsdom it resolves to an http:// URL.
const root = process.cwd()
const srcDir = join(root, 'src')

function iconsReferencedInSrc(): string[] {
    const matchIcon = createMatchRegex(collectionNames)
    const found = new Set<string>()

    for (const entry of readdirSync(srcDir, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || entry.parentPath.includes('__tests__')) {
            continue
        }

        const code = readFileSync(join(entry.parentPath, entry.name), 'utf-8')
        for (const match of code.matchAll(matchIcon)) {
            found.add(`${match[1]}:${match[2]}`)
        }
    }

    return [...found].sort()
}

describe('icon bundle', () => {
    it('resolves every icon referenced in src/ from a locally installed collection', async () => {
        const icons = iconsReferencedInSrc()
        expect(icons.length).toBeGreaterThan(0)

        // Passing them as `icons` rather than `scannedIcons` is deliberate: the
        // resolver only reports unresolved entries for the former.
        const { failed } = await resolveBundleIcons({ icons, resolvePaths: [root] })

        expect(failed).toEqual([])
    })
})
