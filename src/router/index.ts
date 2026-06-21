import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import WalletsView from '@/views/WalletsView.vue'
import WalletCreateView from '@/views/WalletCreateView.vue'
import WalletEditView from '@/views/WalletEditView.vue'
import WalletShareView from '@/views/WalletShareView.vue'
import WalletView from '@/views/WalletView.vue'
import ProfileView from '@/views/ProfileView.vue'
import TagsView from '@/views/TagsView.vue'
import TagView from '@/views/TagView.vue'
import SettingsView from '@/views/settings/SettingsView.vue'
import i18n from '@/lang'

// Brand suffix is appended here in code, NOT inside the i18n messages. vue-i18n treats `|`
// as the plural-form delimiter, so a message like 'Wallets | Cash Track' would be parsed as
// two plural forms and t() would return only the first ('Wallets'). Keeping title messages
// page-name-only and appending the constant suffix here avoids that defect.
const BRAND = 'Cash Track'

export function setDocumentTitle(route: RouteLocationNormalized) {
    const nearest = route.matched.slice().reverse().find(r => r.meta && r.meta.title)
    if (!nearest) return
    const t = i18n.global.t
    const nameForTitle = route.params.nameForTitle
    let pageTitle: string
    if (typeof nameForTitle === 'string' && typeof nearest.meta.namedTitle === 'string') {
        pageTitle = t(nearest.meta.namedTitle as string, { name: nameForTitle })
    } else if (typeof nearest.meta.title === 'string') {
        pageTitle = t(nearest.meta.title as string)
    } else {
        return
    }
    document.title = `${pageTitle} | ${BRAND}`
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/wallets',
            meta: {
                title: 'titles.dashboard',
            },
        },
        {
            path: '/wallets',
            name: 'wallets',
            component: WalletsView,
            meta: {
                title: 'titles.wallets',
            },
        },
        {
            path: '/profile',
            name: 'profile',
            component: ProfileView,
            meta: {
                title: 'titles.profile',
            },
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
            meta: {
                title: 'titles.settings',
            },
        },
        {
            path: '/settings/profile',
            redirect: { name: 'settings' },
        },
        {
            path: '/settings/security',
            redirect: { name: 'settings' },
        },
        {
            path: '/wallets/create',
            name: 'wallets.create',
            component: WalletCreateView,
            meta: {
                title: 'titles.walletCreate',
            },
        },
        {
            path: '/wallets/:walletID',
            name: 'wallets.show',
            component: WalletView,
            props: true,
            meta: {
                title: 'titles.wallet',
                namedTitle: 'titles.walletNamed',
            },
        },
        {
            path: '/wallets/:walletID/edit',
            name: 'wallets.edit',
            component: WalletEditView,
            props: true,
            meta: {
                title: 'titles.walletEdit',
                namedTitle: 'titles.walletEditNamed',
            },
        },
        {
            path: '/wallets/:walletID/share',
            name: 'wallets.share',
            component: WalletShareView,
            props: true,
            meta: {
                title: 'titles.walletShare',
                namedTitle: 'titles.walletShareNamed',
            },
        },
        {
            path: '/tags/:tagID',
            name: 'tags.show',
            component: TagView,
            props: true,
            meta: {
                title: 'titles.tag',
                namedTitle: 'titles.tagNamed',
            },
        },
        {
            path: '/tags',
            name: 'tags',
            component: TagsView,
            meta: {
                title: 'titles.tags',
                namedTitle: 'titles.tags',
            },
        },
    ],
})

router.beforeEach((to, from, next) => {
    setDocumentTitle(to)
    return next()
})

export default router
