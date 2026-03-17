import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/api/models/user'
import { logout as apiLogout } from '@/api/auth'
import { webSiteLink } from '@/shared/links'

export const useAuthStore = defineStore('auth', () => {
    const isLogged = shallowRef(false)
    const isEmailConfirmed = shallowRef(false)

    function login(profile: User) {
        isLogged.value = true
        isEmailConfirmed.value = profile.isEmailConfirmed
    }

    async function logout() {
        try {
            await apiLogout()
        } catch {
            // redirect regardless
        }
        isLogged.value = false
        isEmailConfirmed.value = false
        window.location.href = webSiteLink('/')
    }

    return { isLogged, isEmailConfirmed, login, logout }
})
