import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import SettingsView from "@/views/settings/SettingsView.vue";
import ProfileSettingsView from "@/views/settings/ProfileSettingsView.vue";
import SecuritySettingsView from "@/views/settings/SecuritySettingsView.vue";

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
    {
        path: '/',
        name: 'dashboard',
        component: DashboardView,
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
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

export default router
