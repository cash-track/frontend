<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getEnv } from '@/shared/env'
import { webSiteLink, releaseTagLink, commitLink } from '@/shared/links'

const { t } = useI18n()

const year = new Date().getFullYear()

// Snapshot builds from master pass the branch name as the VITE_APP_VERSION build-arg,
// so only treat it as a release tag when it looks like one (e.g. "v2.0.5").
const releaseTagPattern = /^v\d/

const version = computed(() => getEnv('VITE_APP_VERSION'))
const commit = computed(() => getEnv('VITE_APP_COMMIT'))

const hasReleaseTag = computed(() => releaseTagPattern.test(version.value))
const hasCommit = computed(() => commit.value.length > 0)

const shortCommit = computed(() => commit.value.slice(0, 7))

const versionHref = computed(() => releaseTagLink(version.value))
// With a release tag, both the tag and the sha link to the same release page;
// without one, the sha links to its own commit page.
const commitHref = computed(() =>
    hasReleaseTag.value ? releaseTagLink(version.value) : commitLink(commit.value),
)
</script>

<template>
    <footer class="border-t border-gray-200 dark:border-gray-700 mt-4 py-4 text-sm text-center">
        <UContainer>
            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                <div class="text-center sm:text-left">
                    © {{ year }} Cash Track
                    <template v-if="hasReleaseTag">
                        ·
                        <ULink
                            :href="versionHref"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary-500 hover:text-primary-700 transition-colors"
                        >{{ version }}</ULink>
                    </template>
                    <template v-if="hasCommit">
                        ·
                        <ULink
                            :href="commitHref"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary-500 hover:text-primary-700 transition-colors"
                        >{{ shortCommit }}</ULink>
                    </template>
                </div>
                <div class="text-center" v-html="t('madeBy')" />
                <div class="text-center sm:text-right">
                    <nav class="inline-flex items-center gap-3 flex-wrap justify-center sm:justify-end">
                        <ULink
                            :to="webSiteLink('/cookie-policy')"
                            class="text-primary-500 hover:text-primary-700 transition-colors"
                        >
                            {{ t('cookiePolicy') }}
                        </ULink>
                        <ULink
                            :to="webSiteLink('/privacy-policy')"
                            class="text-primary-500 hover:text-primary-700 transition-colors"
                        >
                            {{ t('privacyPolicy') }}
                        </ULink>
                        <ULink
                            href="https://t.me/cash_track"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary-500 hover:text-primary-700 transition-colors"
                            aria-label="Telegram"
                        >
                            <UIcon name="simple-icons:telegram" class="size-4" />
                        </ULink>
                    </nav>
                </div>
            </div>
        </UContainer>
    </footer>
</template>
