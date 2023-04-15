import Vue from 'vue'
import Vuex from 'vuex'
import Cookies from 'js-cookie'
import { emptyProfile, profileGet, ProfileInterface } from '@/api/profile';

Vue.use(Vuex)

const LOCALE_COOKIE_NAME = 'cshtrkl'

export default new Vuex.Store({
    state: {
        isLogged: false,
        profile: emptyProfile(),
        isEmailConfirmed: true,
        locale: 'en',
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
        }
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
            return profileGet().then(res => {
                if (res.status === 401) {
                    this.commit('logout')
                    return
                }

                this.commit('login', res.data.data)
                this.commit('localeChange', res.data.data.locale)
            }).catch(() => {
                this.commit('logout')
                return
            })
        }
    },
    modules: {}
})
