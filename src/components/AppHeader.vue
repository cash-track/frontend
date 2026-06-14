<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useColorMode, useMediaQuery } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useLocaleStore } from '@/stores/locale'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { updateLocale } from '@/api/profile'
import { webSiteLink } from '@/shared/links'
import { locales, loadLocaleAsync, type LocaleInterface } from '@/lang'
import LogoFull from '@/components/LogoFull.vue'
import HamburgerMenu from '@/components/Shared/HamburgerMenu.vue'

const { t } = useI18n()
const route = useRoute()
const localeStore = useLocaleStore()
const { locale } = storeToRefs(localeStore)
const authStore = useAuthStore()
const { isLogged } = storeToRefs(authStore)
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const mode = useColorMode()

const isHeaderOpened = ref(false)

// The nav lives inside the collapsible. On mobile the hamburger toggles it; on
// desktop (md+) the hamburger is hidden, so force the collapsible open there.
const isDesktop = useMediaQuery('(min-width: 768px)')
const isMenuOpen = computed({
    get: () => isDesktop.value || isHeaderOpened.value,
    set: (value) => { isHeaderOpened.value = value },
})

const availableLocales = computed<DropdownMenuItem[][]>(() => {
    return [
        locales.map<DropdownMenuItem>(function (item): DropdownMenuItem {
            return {
                label: item.name ?? '',
                disabled: item.code === locale.value,
                class: 'cursor-pointer',
                onSelect() {
                    onLocaleChange(item)
                },
            }
        }),
    ]
})
const currentLocale = computed(() => {
    return locales.filter((i) => i.code === locale.value).pop()
})

function onLocaleChange(changed: LocaleInterface) {
    localeStore.localeChange(changed.code)
}

watch(locale, (newLocale) => {
    loadLocaleAsync(newLocale)

    if (isLogged.value) {
        updateLocale(newLocale).catch(() => {})
    }
})

watch(() => route.fullPath, () => {
    isHeaderOpened.value = false
})

const profileMenuItems = computed<DropdownMenuItem[][]>(() => {
    return [
        [
            {
                label: t('profile.profile'),
                icon: 'i-heroicons-user-circle-20-solid',
                to: { name: 'profile' },
            },
            {
                label: t('settings'),
                icon: 'i-heroicons-cog-6-tooth-20-solid',
                to: { name: 'settings.profile' },
            },
            {
                label: t('signOut'),
                icon: 'i-heroicons-arrow-right-on-rectangle-20-solid',
                onSelect: () => onLogout(),
            },
        ],
    ]
})

function onMobileHeaderClick() {
    isHeaderOpened.value = !isHeaderOpened.value
}

function onLogout() {
    authStore.logout()
}
</script>

<template>
    <div class="mb-5 py-2 px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
        <UContainer>
            <div>
                <div class="flex justify-between md:hidden">
                    <ULink class="w-[162px] inline-block my-0.5 mr-4 py-0 h-9" :to="webSiteLink('/')">
                        <LogoFull />
                    </ULink>

                    <UButton
                        class="text-xl"
                        variant="subtle"
                        color="neutral"
                        :aria-expanded="isHeaderOpened"
                        :aria-label="t('menu')"
                        aria-controls="app-header-menu"
                        @click="onMobileHeaderClick"
                    >
                        <HamburgerMenu :isOpen="isHeaderOpened" />
                    </UButton>
                </div>
                <UCollapsible
                    v-model:open="isMenuOpen"
                    :unmountOnHide="false"
                >
                    <template #content>
                        <div id="app-header-menu" class="grid grid-flow-row justify-stretch md:grid-flow-col">
                            <div class="flex justify-start">
                                <ULink class="w-[162px] my-0.5 mr-4 py-0 h-9 hidden md:block" :to="webSiteLink('/')">
                                    <LogoFull />
                                </ULink>

                                <ul class="flex flex-col md:flex-row">
                                    <li>
                                        <ULink
                                            :to="{ name: 'wallets' }"
                                            class="block px-2 py-2 text-black/50 hover:text-black/70 active:text-black/70 dark:text-white/80 dark:hover:text-green-500 dark:active:text-green-500"
                                            exact
                                            active-class="text-black/90! dark:text-green-500/80!"
                                        >
                                            {{ t('wallets.wallets') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink
                                            :to="{ name: 'tags' }"
                                            class="block px-2 py-2 text-black/50 hover:text-black/70 active:text-black/70 dark:text-white/80 dark:hover:text-green-500 dark:active:text-green-500"
                                            exact
                                            active-class="text-black/90! dark:text-green-500/80!"
                                        >
                                            {{ t('tags.tags') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink
                                            :to="{ name: 'profile' }"
                                            class="block px-2 py-2 text-black/50 hover:text-black/70 active:text-black/70 dark:text-white/80 dark:hover:text-green-500 dark:active:text-green-500"
                                            exact
                                            active-class="text-black/90! dark:text-green-500/80!"
                                        >
                                            {{ t('profile.profile') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink :to="webSiteLink('/help')" class="block px-2 py-2 text-black/50 hover:text-black/70 active:text-black/70 dark:text-white/80 dark:hover:text-green-500 dark:active:text-green-500">
                                            {{ t('help') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink
                                            :to="webSiteLink('/about')"
                                            class="block px-2 py-2 text-black/50 hover:text-black/70 active:text-black/70 dark:text-white/80 dark:hover:text-green-500 dark:active:text-green-500 truncate"
                                        >
                                            {{ t('about') }}
                                        </ULink>
                                    </li>
                                </ul>
                            </div>
                            <div class="flex justify-start flex-col md:justify-end md:flex-row">
                                <UButton
                                    :icon="mode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
                                    color="neutral"
                                    variant="subtle"
                                    :aria-label="t('darkMode')"
                                    @click="mode = mode === 'dark' ? 'light' : 'dark'"
                                    class="mr-4 ring-0 cursor-pointer"
                                />
                                <UDropdownMenu
                                    class="mr-4 text-xl ring-0"
                                    :items="availableLocales"
                                    :content="{ side: 'bottom', align: 'start' }"
                                >
                                    <UButton
                                        color="neutral"
                                        :label="currentLocale?.flag"
                                        variant="subtle"
                                        trailing-icon="i-heroicons-chevron-down-20-solid"
                                        :aria-label="t('language')"
                                        class="cursor-pointer"
                                    />
                                </UDropdownMenu>
                                <UDropdownMenu
                                    class="ring-0"
                                    :items="profileMenuItems"
                                    :content="{ side: 'bottom', align: 'start' }"
                                >
                                    <UButton
                                        color="neutral"
                                        variant="subtle"
                                        trailing-icon="i-heroicons-chevron-down-20-solid"
                                        class="cursor-pointer"
                                        :label="profile?.displayName"
                                    >
                                        <template #leading>
                                            <UAvatar
                                                :src="profile?.photoUrl ?? undefined"
                                                :text="profile?.name?.charAt(0)"
                                                size="xs"
                                            />
                                        </template>
                                    </UButton>

                                    <template #item="{ item }">
                                        <span class="truncate">{{ item.label }}</span>
                                        <UIcon
                                            :name="item.icon"
                                            class="shrink-0 my-auto h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"
                                        />
                                    </template>
                                </UDropdownMenu>
                            </div>
                        </div>
                    </template>
                </UCollapsible>
            </div>
        </UContainer>
    </div>
</template>
