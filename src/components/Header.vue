<template>
    <div>
        <b-navbar toggleable="lg" type="light">
            <b-container>
                <b-navbar-brand :href="getWebSiteLink('/')">Cash Track</b-navbar-brand>

                <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

                <b-collapse id="nav-collapse" is-nav>
                    <b-navbar-nav>
                        <b-nav-item :to="{name: 'dashboard'}" exact-active-class="active">Dashboard</b-nav-item>
                    </b-navbar-nav>

                    <b-navbar-nav class="ml-auto">
                        <b-navbar-nav>
                            <b-nav-item :to="{name: 'my-profile'}" exact-active-class="active">My Profile</b-nav-item>
                        </b-navbar-nav>
                    </b-navbar-nav>
                </b-collapse>
            </b-container>
        </b-navbar>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { webSiteLink } from '@/shared/links';

@Component
export default class Header extends Vue {
    getWebSiteLink(path: string): string {
        return webSiteLink(path)
    }
}
</script>

<style scoped>
    .navbar {
        background: #f5f5f5;
        border-bottom: 1px solid #e5e5e5;
        border-radius: 0;
        margin-bottom: 20px;
    }
</style>