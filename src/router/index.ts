import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import SettingsView from "@/views/settings/SettingsView.vue";
import ProfileSettingsView from "@/views/settings/ProfileSettingsView.vue";
import SecuritySettingsView from "@/views/settings/SecuritySettingsView.vue";
import ProfileView from "@/views/ProfileView.vue";
import WalletsView from "@/views/WalletsView.vue";
import WalletView from "@/views/WalletView.vue";
import WalletCreateView from "@/views/WalletCreateView.vue";

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
    {
        path: '/',
        redirect: '/wallets'
    },
    {
        path: '/wallets',
        name: 'wallets',
        component: WalletsView,
    },
    {
        path: '/profile',
        name: 'profile',
        component: ProfileView,
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsView,
        children: [
            {
                path: 'profile',
                name: 'settings.profile',
                component: ProfileSettingsView
            },
            {
                path: 'security',
                name: 'settings.security',
                component: SecuritySettingsView
            },
        ],
    },
    {
        path: '/wallets/create',
        name: 'wallets.create',
        component: WalletCreateView,
    },
    {
        path: '/wallets/:walletID',
        name: 'wallets.show',
        component: WalletView,
        props: true,
    },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

export default router
