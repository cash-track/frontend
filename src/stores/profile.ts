import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/api/models/user'
import { getProfile } from '@/api/profile'
import { useAuthStore } from './auth'
import { useLocaleStore } from './locale'
import {
    type CachedProfile,
    readCachedProfile,
    writeCachedProfile,
} from '@/shared/profileCookie'

function toCachedProfile(user: User): CachedProfile {
    return {
        v: 1,
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        nickName: user.nickName,
        email: user.email,
        photoUrl: user.photoUrl,
        isEmailConfirmed: user.isEmailConfirmed,
        locale: user.locale,
    }
}

export const useProfileStore = defineStore('profile', () => {
    const profile = shallowRef<User | null>(null)
    const cachedProfile = shallowRef<CachedProfile | null>(null)
    const loading = shallowRef(false)
    const failed = shallowRef(false)
    const lastError = shallowRef<unknown>(null)

    // Called from App.vue so store creation stays side-effect free — mirrors loadCachedLocale().
    function loadCachedProfile() {
        const cached = readCachedProfile()
        cachedProfile.value = cached
        if (cached) {
            useAuthStore().login(cached)
        }
    }

    function setProfile(user: User) {
        profile.value = user
        const cached = toCachedProfile(user)
        cachedProfile.value = cached
        writeCachedProfile(cached)
        useAuthStore().login(user)
        useLocaleStore().localeChange(user.locale as 'en' | 'uk')
    }

    async function loadProfile() {
        loading.value = true
        failed.value = false
        lastError.value = null
        try {
            setProfile(await getProfile())
        } catch (error) {
            failed.value = true
            lastError.value = error
            // Drop the optimistic state or isLogged stays true and App.vue shows a stale
            // header instead of the retry alert. The cookie itself is left alone.
            profile.value = null
            cachedProfile.value = null
            useAuthStore().reset()
        } finally {
            loading.value = false
        }
    }

    function updatePhotoUrl(url: string) {
        if (!profile.value) return
        profile.value = { ...profile.value, photoUrl: url } as User
        const cached = toCachedProfile(profile.value)
        cachedProfile.value = cached
        writeCachedProfile(cached)
    }

    return {
        profile,
        cachedProfile,
        loading,
        failed,
        lastError,
        loadCachedProfile,
        loadProfile,
        setProfile,
        updatePhotoUrl,
    }
})
