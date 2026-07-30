import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { logout as apiLogout } from '@/api/auth'
import { webSiteLink } from '@/shared/links'
import { clearCachedProfile } from '@/shared/profileCookie'

export const useAuthStore = defineStore('auth', () => {
    const isLogged = shallowRef(false)
    const isEmailConfirmed = shallowRef(false)

    // Structural param so both User and the leaner CachedProfile can seed this.
    function login(profile: { isEmailConfirmed: boolean }) {
        isLogged.value = true
        isEmailConfirmed.value = profile.isEmailConfirmed
    }

    function reset() {
        isLogged.value = false
        isEmailConfirmed.value = false
    }

    async function logout() {
        try {
            await apiLogout()
        } catch {
            // redirect regardless
        }
        reset()
        clearCachedProfile()
        window.location.href = webSiteLink('/')
    }

    return { isLogged, isEmailConfirmed, login, reset, logout }
})
