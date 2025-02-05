import Vue from 'vue'
import Vuex from 'vuex'
import Cookies from 'js-cookie'
import {
    emptyProfile,
    ProfileInterface,
    ProfileRepository,
    ProfileRepositoryInterface
} from '@/api/profile';
import {
    WalletFullInterface,
    WalletsRepositoryInterface,
    WalletsRepository
} from '@/api/wallets';

Vue.use(Vuex)

const LOCALE_COOKIE_NAME = 'cshtrkl'

const profileRepository: ProfileRepositoryInterface = new ProfileRepository()
const walletsRepository: WalletsRepositoryInterface = new WalletsRepository()

export default new Vuex.Store({
    state: {
        isLogged: false,
        profile: emptyProfile(),
        isEmailConfirmed: true,
        locale: 'en',

        activeWallets: new Array<WalletFullInterface>(),
        activeWalletsLoadingStatus: false,
        activeWalletsLoadingFailed: false,
    },
    mutations: {
        logout(state) {
            state.isLogged = false;
            state.profile = emptyProfile();
            state.isEmailConfirmed = true;
        },

        login(state, profile: ProfileInterface) {
            state.isLogged = true;
            state.profile = profile;
            state.isEmailConfirmed = profile.isEmailConfirmed;
        },

        profilePhotoUpdated(state, photoUrl: string) {
            state.profile.photoUrl = photoUrl;
        },

        localeChange(state, locale: string) {
            state.locale = locale;

            Cookies.set(LOCALE_COOKIE_NAME, state.locale, {
                path: '/',
                secure: false,
                sameSite: 'strict',
                expires: 365,
            })
        },

        activeWalletsLoadingChanged(state, status: null|boolean) {
            if (status === null) {
                state.activeWallets = new Array<WalletFullInterface>();
                state.activeWalletsLoadingFailed = true
                state.activeWalletsLoadingStatus = false
                return
            }

            state.activeWalletsLoadingStatus = status
            state.activeWalletsLoadingFailed = false
        },

        activeWalletsChanged(state, wallets: Array<WalletFullInterface>) {
            state.activeWallets = wallets;
        },
    },
    actions: {
        loadCachedLocale() {
            const locale = Cookies.get(LOCALE_COOKIE_NAME)

            if (locale === undefined) {
                this.commit('localeChange', this.state.locale)
                return
            }

            this.commit('localeChange', locale)
        },

        loadProfile() {
            return profileRepository.get().then(res => {
                if (res.status === 401) {
                    this.commit('logout')
                    return
                }

                this.commit('login', res.data.data)
                this.commit('localeChange', res.data.data.locale)
                this.dispatch('loadActiveWallets')
            }).catch(() => {
                this.commit('logout')
                return
            })
        },

        loadActiveWallets() {
            this.commit('activeWalletsLoadingChanged', false)
            return walletsRepository.getUnArchived().then(res => {
                this.commit('activeWalletsChanged', res.data.data)
                this.commit('activeWalletsLoadingChanged', true)
            }).catch(() => {
                this.commit('activeWalletsLoadingChanged', null)
            })
        }
    },
    modules: {}
})
