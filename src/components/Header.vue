<template>
    <div>
        <b-navbar toggleable="lg" type="light">
            <b-container>
                <b-navbar-brand :href="getWebSiteLink('/')">Cash Track 🇺🇦</b-navbar-brand>

                <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

                <b-collapse id="nav-collapse" is-nav>
                    <b-navbar-nav>
                        <b-nav-item :to="{name: 'wallets'}" exact-active-class="active">Wallets</b-nav-item>
                        <b-nav-item :to="{name: 'tags'}" exact-active-class="active">Tags</b-nav-item>
                        <b-nav-item :to="{name: 'profile'}" exact-active-class="active">Profile</b-nav-item>
                        <b-nav-item :href="helpLink">Help</b-nav-item>
                        <b-nav-item :href="aboutLink">About</b-nav-item>
                    </b-navbar-nav>

                    <b-navbar-nav class="ml-auto">
                        <b-navbar-nav v-if="!isLogged">
                            <b-nav-item>My Profile</b-nav-item>
                        </b-navbar-nav>

                        <b-nav-item-dropdown v-if="isLogged" right>
                            <template v-slot:button-content>
                                <profile-avatar :user="profile"></profile-avatar>
                                {{ profile.name }}
                            </template>
                            <b-dropdown-item :to="{name: 'wallets'}">Wallets</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'wallets.create'}">New Wallet</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'tags'}">Tags</b-dropdown-item>
                            <b-dropdown-divider></b-dropdown-divider>
                            <b-dropdown-item :to="{name: 'profile'}">Profile</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'settings.profile'}">Settings</b-dropdown-item>
                            <b-dropdown-item href="#" @click="onLogout">Sign Out</b-dropdown-item>
                        </b-nav-item-dropdown>
                    </b-navbar-nav>
                </b-collapse>
            </b-container>
        </b-navbar>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { logout } from '@/api/auth';
import { webSiteLink } from '@/shared/links';
import {ProfileInterface} from '@/api/profile';
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue';

@Component({
    components: {ProfileAvatar}
})
export default class Header extends Vue {
    getWebSiteLink(path: string): string {
        return webSiteLink(path)
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

    protected onLogout(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        logout().then(res => {
            this.$store.commit('logout')

            window.location.href = res.data.redirectUrl ? res.data.redirectUrl : webSiteLink('/login');
        })
    }
}
</script>

<style lang="scss" scoped>
    .navbar {
        background: #f5f5f5;
        border-bottom: 1px solid #e5e5e5;
        border-radius: 0;
        margin-bottom: 20px;

        .b-avatar {
            margin: -13px 5px -10px 0;
        }
    }
</style>