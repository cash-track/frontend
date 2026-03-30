<script setup lang="ts">
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { unshareWallet } from '@/api/wallets'
import type { User } from '@/api/models/user'
import { useNotifications } from '@/composables/useNotifications'

const props = defineProps<{
    walletId: number
    walletName: string
    user: User
    isAllowedToRemove: boolean
}>()

const emit = defineEmits<{
    deleted: [userId: number]
}>()

const { t } = useI18n()
const { notifyError } = useNotifications()
const removing = shallowRef(false)

async function onRemove() {
    removing.value = true
    try {
        await unshareWallet(props.walletId, props.user.id)
        emit('deleted', props.user.id)
    } catch {
        notifyError(t('wallets.shareMembersLoadingError'))
    } finally {
        removing.value = false
    }
}
</script>

<template>
    <div class="flex items-center justify-between gap-2 py-2">
        <div class="flex items-center gap-2 min-w-0">
            <UAvatar
                :src="user.photoUrl ?? undefined"
                :alt="user.displayName"
                size="sm"
            />
            <span class="text-sm truncate">{{ user.displayName }}</span>
        </div>
        <UTooltip
            v-if="isAllowedToRemove"
            :arrow="true"
            :text="t('wallets.shareCancelInvite', [walletName])"
        >
            <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-x"
                size="xs"
                :loading="removing"
                @click="onRemove"
            />
        </UTooltip>
    </div>
</template>
