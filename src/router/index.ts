import { createRouter, createWebHistory } from 'vue-router'
import WalletsView from '@/views/WalletsView.vue'
import WalletCreateView from '@/views/WalletCreateView.vue'
import WalletEditView from '@/views/WalletEditView.vue'
import WalletShareView from '@/views/WalletShareView.vue'
import WalletView from '@/views/WalletView.vue'
import ProfileView from '@/views/ProfileView.vue'
import TagsView from '@/views/TagsView.vue'
import TagView from '@/views/TagView.vue'
import SettingsView from '@/views/settings/SettingsView.vue'
import ProfileSettingsView from '@/views/settings/ProfileSettingsView.vue'
import SecuritySettingsView from '@/views/settings/SecuritySettingsView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/wallets',
            meta: {
                title: 'Dashboard | Cash Track',
            },
        },
        {
            path: '/wallets',
            name: 'wallets',
            component: WalletsView,
            meta: {
                title: 'Wallets | Cash Track',
            },
        },
        {
            path: '/profile',
            name: 'profile',
            component: ProfileView,
            meta: {
                title: 'Profile | Cash Track',
            },
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
            redirect: { name: 'settings.profile' },
            meta: {
                title: 'Settings | Cash Track',
            },
            children: [
                {
                    path: 'profile',
                    name: 'settings.profile',
                    component: ProfileSettingsView,
                    meta: {
                        title: 'Profile Settings | Cash Track',
                    },
                },
                {
                    path: 'security',
                    name: 'settings.security',
                    component: SecuritySettingsView,
                    meta: {
                        title: 'Security Settings | Cash Track',
                    },
                },
            ],
        },
        {
            path: '/wallets/create',
            name: 'wallets.create',
            component: WalletCreateView,
            meta: {
                title: 'Create Wallet | Cash Track',
            },
        },
        {
            path: '/wallets/:walletID',
            name: 'wallets.show',
            component: WalletView,
            props: true,
            meta: {
                title: 'Wallet | Cash Track',
                namedTitle: '{name} | Cash Track',
            },
        },
        {
            path: '/wallets/:walletID/edit',
            name: 'wallets.edit',
            component: WalletEditView,
            props: true,
            meta: {
                title: 'Edit Wallet | Cash Track',
                namedTitle: 'Edit {name} | Cash Track',
            },
        },
        {
            path: '/wallets/:walletID/share',
            name: 'wallets.share',
            component: WalletShareView,
            props: true,
            meta: {
                title: 'Share Wallet | Cash Track',
                namedTitle: 'Share {name} | Cash Track',
            },
        },

        {
            path: '/tags/:tagID',
            name: 'tags.show',
            component: TagView,
            props: true,
            meta: {
                title: 'Tag | Cash Track',
                namedTitle: '{name} | Cash Track',
            },
        },
        {
            path: '/tags',
            name: 'tags',
            component: TagsView,
            meta: {
                title: 'Tags | Cash Track',
                namedTitle: 'Tags | Cash Track',
            }
        },
    ],
})

router.beforeEach((to, from, next) => {
    const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);

    if (nearestWithTitle) {
        if (to.params.nameForTitle && typeof to.params.nameForTitle === 'string' &&
            typeof nearestWithTitle.meta.namedTitle === 'string'
        ) {
            document.title = nearestWithTitle.meta.namedTitle.replace(/\{name\}/g, to.params.nameForTitle as string)
        } else if (typeof nearestWithTitle.meta.title === 'string') {
            document.title = nearestWithTitle.meta.title;
        }
    }

    return next();
})

export default router
