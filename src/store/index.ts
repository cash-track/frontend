import Vue from 'vue'
import Vuex from 'vuex'
import {emptyProfile, profileGet, ProfileInterface} from "@/api/profile";

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        isLogged: false,
        profile: emptyProfile(),
    },
    mutations: {
        logout(state) {
            state.isLogged = false;
            state.profile = emptyProfile();
        },

        login(state, profile: ProfileInterface) {
            state.isLogged = true;
            state.profile = profile;
        }
    },
    actions: {
        loadProfile() {
            return profileGet().then(res => {
                if (res.status !== 200 || res.data.data.id === 0) {
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
