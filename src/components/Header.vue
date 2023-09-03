<template>
    <div>
        <b-navbar toggleable="lg" type="light">
            <b-container>
                <b-navbar-brand :href="getWebSiteLink('/')">
                    <logo></logo>
                </b-navbar-brand>

                <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

                <b-collapse id="nav-collapse" is-nav>
                    <b-navbar-nav>
                        <b-nav-item :to="{name: 'wallets'}" exact-active-class="active">{{ $t('wallets.wallets') }}</b-nav-item>
                        <b-nav-item :to="{name: 'tags'}" exact-active-class="active">{{ $t('tags.tags') }}</b-nav-item>
                        <b-nav-item :to="{name: 'profile'}" exact-active-class="active">{{ $t('profile.profile') }}</b-nav-item>
                        <b-nav-item :href="helpLink">{{ $t('help') }}</b-nav-item>
                        <b-nav-item :href="aboutLink">{{ $t('about') }}</b-nav-item>
                    </b-navbar-nav>

                    <b-navbar-nav class="ml-auto">
                        <b-nav-item-dropdown right>
                            <template v-slot:button-content>
                                <span class="current-locale">{{ $t('flag') }}</span>
                            </template>
                            <b-dropdown-item v-for="locale of locales"
                                             :key="locale.code"
                                             @click="onLocaleChange(locale.code, $event)"
                                             :active="currentLocale === locale.code"
                            >{{ locale.name }}</b-dropdown-item>
                        </b-nav-item-dropdown>

                        <b-navbar-nav v-if="!isLogged">
                            <b-nav-item>{{ $t('myProfile') }}</b-nav-item>
                        </b-navbar-nav>

                        <b-nav-item-dropdown v-if="isLogged" right>
                            <template v-slot:button-content>
                                <profile-avatar :user="profile"></profile-avatar>
                                {{ profile.name }}
                            </template>
                            <b-dropdown-item :to="{name: 'wallets'}">{{ $t('wallets.wallets') }}</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'wallets.create'}">{{ $t('wallets.newWallet') }}</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'tags'}">{{ $t('tags.tags') }}</b-dropdown-item>
                            <b-dropdown-divider></b-dropdown-divider>
                            <b-dropdown-item :to="{name: 'profile'}">{{ $t('profile.profile') }}</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'settings.profile'}">{{ $t('settings') }}</b-dropdown-item>
                            <b-dropdown-item href="#" @click="onLogout">{{ $t('signOut') }}</b-dropdown-item>
                        </b-nav-item-dropdown>
                    </b-navbar-nav>
                </b-collapse>
            </b-container>
        </b-navbar>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { logout } from '@/api/auth';
import { webSiteLink } from '@/shared/links';
import { ProfileInterface, profilePutLocale } from '@/api/profile';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';
import Logo from '@/components/Logo.vue';
import { loadLanguageAsync, locales } from '@/lang';

@Component({
    components: {ProfileAvatar, Logo}
})
export default class Header extends Vue {
    getWebSiteLink(path: string): string {
        return webSiteLink(path)
    }

    mounted() {
        this.$moment.locale(this.currentLocale)
    }

    get isLogged(): boolean {
        return this.$store.state.isLogged
    }

    get profile(): ProfileInterface {
        return this.$store.state.profile
    }

    get helpLink(): string {
        return webSiteLink('/help')
    }

    get aboutLink(): string {
        return webSiteLink('/about')
    }

    get locales() {
        return locales;
    }

    get currentLocale() {
        return this.$store.state.locale
    }

    protected onLogout(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        logout().then(res => {
            this.$store.commit('logout')

            window.location.href = res.data.redirectUrl ? res.data.redirectUrl : webSiteLink('/login');
        })
    }

    protected onLocaleChange(locale: string, event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.$store.commit('localeChange', locale)
    }

    @Watch('currentLocale')
    protected localeChangeObserver() {
        loadLanguageAsync(this.currentLocale)

        this.$moment.locale(this.currentLocale)

        if (this.isLogged) {
            profilePutLocale({
                locale: this.currentLocale
            }).then(() => {
                console.info('Profile locale has been updated')
            }).catch(err => {
                console.error(err)
            })
        }
    }
}
</script>

<style lang="scss" scoped>
    .navbar {
        .navbar-brand {
            padding-top: 0;
            padding-bottom: 0;
            height: 36px;
        }

        background: #f5f5f5;
        border-bottom: 1px solid #e5e5e5;
        border-radius: 0;
        margin-bottom: 20px;

        .b-avatar {
            margin: -13px 5px -10px 0;
        }

        .current-locale {
            color: rgba(0, 0, 0, 1);
            line-height: 1;
            font-size: 20px;
        }
    }
</style>
