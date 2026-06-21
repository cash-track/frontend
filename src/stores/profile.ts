import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/api/models/user'
import { getProfile } from '@/api/profile'
import { useAuthStore } from './auth'
import { useLocaleStore } from './locale'

export const useProfileStore = defineStore('profile', () => {
    const profile = shallowRef<User | null>(null)
    const loading = shallowRef(false)

    function setProfile(user: User) {
        profile.value = user
        useAuthStore().login(user)
        useLocaleStore().localeChange(user.locale as 'en' | 'uk')
    }

    async function loadProfile() {
        loading.value = true
        try {
            setProfile(await getProfile())
        } catch {
            useAuthStore().logout()
        } finally {
            loading.value = false
        }
    }

    function updatePhotoUrl(url: string) {
        if (!profile.value) return
        profile.value = { ...profile.value, photoUrl: url } as User
    }

    return { profile, loading, loadProfile, setProfile, updatePhotoUrl }
})
