import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/api/models/user'
import { webSiteLink } from '@/shared/links'

export const useAuthStore = defineStore('auth', () => {
    const isLogged = shallowRef(false)
    const isEmailConfirmed = shallowRef(false)

    function login(profile: User) {
        isLogged.value = true
        isEmailConfirmed.value = profile.isEmailConfirmed
    }

    function logout() {
        isLogged.value = false
        isEmailConfirmed.value = false
        window.location.href = webSiteLink('/')
    }

    return { isLogged, isEmailConfirmed, login, logout }
})
