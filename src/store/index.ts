import Vue from 'vue'
import Vuex from 'vuex'
import { emptyProfile, profileGet, ProfileInterface } from '@/api/profile';

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        isLogged: false,
        profile: emptyProfile(),
        isEmailConfirmed: true,
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
    },
    actions: {
        loadProfile() {
            return profileGet().then(res => {
                if (res.status === 401) {
                    this.commit('logout')
                    return
                }

                this.commit('login', res.data.data)
            }).catch(() => {
                this.commit('logout')
                return
            })
        }
    },
    modules: {}
})
