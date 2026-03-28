<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
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
const localeStore = useLocaleStore()
const { locale } = storeToRefs(localeStore)
const authStore = useAuthStore()
const { isLogged } = storeToRefs(authStore)
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const mode = useColorMode()

const isHeaderOpened = ref(false)
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
    <div class="header">
        <UContainer>
            <div class="navbar">
                <div class="navbar-mobile-head">
                    <ULink class="logo-link" :to="webSiteLink('/')">
                        <LogoFull />
                    </ULink>

                    <UButton
                        class="text-xl"
                        variant="subtle"
                        color="neutral"
                        @click="onMobileHeaderClick"
                    >
                        <HamburgerMenu />
                    </UButton>
                </div>
                <UCollapsible
                    v-model:open="isHeaderOpened"
                    :unmountOnHide="false"
                    class="collapse-root"
                >
                    <template #content>
                        <div class="navbar-root">
                            <div class="navbar-main">
                                <ULink class="logo-link" :to="webSiteLink('/')">
                                    <LogoFull />
                                </ULink>

                                <ul>
                                    <li>
                                        <ULink
                                            :to="{ name: 'wallets' }"
                                            class="navbar-link"
                                            exact
                                            active-class="active"
                                        >
                                            {{ t('wallets.wallets') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink
                                            :to="{ name: 'tags' }"
                                            class="navbar-link"
                                            exact
                                            active-class="active"
                                        >
                                            {{ t('tags.tags') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink
                                            :to="{ name: 'profile' }"
                                            class="navbar-link"
                                            exact
                                            active-class="active"
                                        >
                                            {{ t('profile.profile') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink :to="webSiteLink('/help')" class="navbar-link">
                                            {{ t('help') }}
                                        </ULink>
                                    </li>
                                    <li>
                                        <ULink
                                            :to="webSiteLink('/about')"
                                            class="navbar-link truncate"
                                        >
                                            {{ t('about') }}
                                        </ULink>
                                    </li>
                                </ul>
                            </div>
                            <div class="navbar-right">
                                <UButton
                                    :icon="mode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
                                    color="neutral"
                                    variant="subtle"
                                    @click="mode = mode === 'dark' ? 'light' : 'dark'"
                                    class="color-mode-selector cursor-pointer"
                                />
                                <UDropdownMenu
                                    class="lang-selector"
                                    :items="availableLocales"
                                    :popper="{ placement: 'bottom-start' }"
                                >
                                    <UButton
                                        color="neutral"
                                        :label="currentLocale?.flag"
                                        variant="subtle"
                                        trailing-icon="i-heroicons-chevron-down-20-solid"
                                        class="cursor-pointer"
                                    />
                                </UDropdownMenu>
                                <UDropdownMenu
                                    class="profile-menu"
                                    :items="profileMenuItems"
                                    :popper="{ placement: 'bottom-start' }"
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

<style>
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

html.dark {
    &,
    .footer,
    .header {
        @apply bg-gray-800;

        border-bottom: 1px solid #474747;

        body {
            @apply bg-gray-700;
        }
    }
}

html,
.footer,
.header {
    @apply bg-gray-100;

    border-bottom: 1px solid #e5e5e5;

    body {
        @apply bg-white;
    }
}

@media (min-width: 768px) {
    .header .navbar .collapse-root > div {
        content-visibility: auto;
    }
}

.header {
    @apply mb-5 py-2 px-4 dark:border-gray-600;

    .navbar {
        .navbar-root {
            @apply grid grid-flow-row justify-stretch md:grid-flow-col;
        }

        .navbar-mobile-head {
            @apply flex justify-between md:hidden;
        }

        .navbar-main {
            @apply flex justify-start;

            .logo-link {
                @apply hidden md:block;
            }
        }

        .navbar-right {
            @apply flex justify-start flex-col md:justify-end md:flex-row;
        }

        .logo-link {
            width: 162px;

            @apply inline-block my-0.5 mr-4 py-0 h-9;
        }

        .lang-selector {
            @apply mr-4 text-xl ring-0;
        }

        .color-mode-selector {
            @apply mr-4 ring-0;
        }

        .profile-menu {
            @apply ring-0;
        }

        .navbar-link {
            @apply text-black/50 hover:text-black/70 active:text-black/70 dark:text-white/80 dark:hover:text-green-500 dark:active:text-green-500;

            &.active {
                @apply text-black/90 dark:text-green-500/80;
            }
        }

        ul {
            @apply flex flex-col md:flex-row;

            li {
                a {
                    @apply block px-2 py-2;
                }
            }
        }
    }
}
</style>
