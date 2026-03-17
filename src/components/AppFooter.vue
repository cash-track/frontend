<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { webSiteLink } from '@/shared/links'

const { t } = useI18n()

const year = new Date().getFullYear()
</script>

<template>
    <footer class="border-t border-gray-200 dark:border-gray-700 mt-4 py-4 text-sm text-center">
        <UContainer>
            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                <div class="text-center sm:text-left">
                    © {{ year }} Cash Track
                </div>
                <div class="text-center" v-html="t('madeBy')" />
                <div class="text-center sm:text-right">
                    <nav class="inline-flex items-center gap-3 flex-wrap justify-center sm:justify-end">
                        <ULink
                            :to="webSiteLink('/cookie-policy')"
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            {{ t('cookiePolicy') }}
                        </ULink>
                        <ULink
                            :to="webSiteLink('/privacy-policy')"
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            {{ t('privacyPolicy') }}
                        </ULink>
                        <ULink
                            href="https://t.me/cash_track"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
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
