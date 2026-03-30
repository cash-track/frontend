<script setup lang="ts">
import { shallowRef, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWalletUsers, shareWallet } from '@/api/wallets'
import { findUserByEmail, findUsersByCommonWallets } from '@/api/users'
import type { Wallet } from '@/api/models/wallet'
import type { User } from '@/api/models/user'
import { useApiErrors } from '@/composables/useApiErrors'
import { useNotifications } from '@/composables/useNotifications'
import WalletSharedMember from './WalletSharedMember.vue'

const props = defineProps<{ wallet: Wallet }>()

const { t } = useI18n()
const { fieldErrors, handleError, reset } = useApiErrors()
const { notifyError } = useNotifications()

const members = shallowRef<User[]>([])
const commonUsers = shallowRef<User[]>([])
const loadFailed = shallowRef(false)

const searchEmail = shallowRef('')
const foundUser = shallowRef<User | null>(null)
const searching = shallowRef(false)
const inviting = shallowRef(false)

const memberIds = computed(() => new Set(members.value.map(u => u.id)))

const filteredCommonUsers = computed(() =>
    commonUsers.value.filter(u => !memberIds.value.has(u.id) && u.id !== foundUser.value?.id),
)

onMounted(async () => {
    try {
        const [walletUsers, common] = await Promise.all([
            getWalletUsers(props.wallet.id),
            findUsersByCommonWallets(),
        ])
        members.value = walletUsers
        commonUsers.value = common
    } catch {
        loadFailed.value = true
    }
})

async function onSearch() {
    reset()
    searching.value = true
    foundUser.value = null
    try {
        foundUser.value = await findUserByEmail(searchEmail.value)
    } catch {
        fieldErrors.value = { email: [t('wallets.shareSearchError')] }
    } finally {
        searching.value = false
    }
}

async function onInvite(user: User) {
    inviting.value = true
    try {
        await shareWallet(props.wallet.id, user.id)
        members.value = [...members.value, user]
        foundUser.value = null
        searchEmail.value = ''
    } catch (error) {
        handleError(error)
        notifyError(t('wallets.shareMembersLoadingError'))
    } finally {
        inviting.value = false
    }
}

function onMemberDeleted(userId: number) {
    members.value = members.value.filter(u => u.id !== userId)
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="font-semibold text-lg">
                {{ t('wallets.shareTitle') }} <span class="font-bold">{{ wallet.name }}</span>
            </h2>
        </template>

        <div class="space-y-4">
            <UAlert
                v-if="loadFailed"
                color="error"
                :description="t('wallets.shareMembersLoadingError')"
                icon="i-lucide-alert-circle"
            />

            <!-- Current members -->
            <div v-if="members.length > 0" class="divide-y divide-default">
                <WalletSharedMember
                    v-for="member in members"
                    :key="member.id"
                    :wallet-id="wallet.id"
                    :wallet-name="wallet.name"
                    :user="member"
                    :is-allowed-to-remove="members.length > 1"
                    @deleted="onMemberDeleted"
                />
            </div>

            <!-- Common users suggestions -->
            <template v-if="filteredCommonUsers.length > 0">
                <USeparator :label="t('wallets.shareCommonUsers')" />
                <div class="divide-y divide-default">
                    <div
                        v-for="user in filteredCommonUsers"
                        :key="user.id"
                        class="flex items-center justify-between gap-2 py-2"
                    >
                        <div class="flex items-center gap-2 min-w-0">
                            <UAvatar
                                :src="user.photoUrl ?? undefined"
                                :alt="user.displayName"
                                size="sm"
                            />
                            <span class="text-sm truncate">{{ user.displayName }}</span>
                        </div>
                        <UButton
                            variant="ghost"
                            size="xs"
                            :label="t('wallets.shareSelect')"
                            :loading="inviting"
                            @click="onInvite(user)"
                        />
                    </div>
                </div>
            </template>

            <USeparator />

            <!-- Search by email -->
            <div v-if="!foundUser">
                <UFormField
                    :label="t('wallets.shareEmailHint')"
                    :error="fieldErrors.email?.[0]"
                >
                    <div class="flex gap-2">
                        <UInput
                            v-model="searchEmail"
                            type="email"
                            :placeholder="t('wallets.shareEmailHint')"
                            class="flex-1"
                            :disabled="searching"
                            @keydown.enter="onSearch"
                        />
                        <UButton
                            :label="t('wallets.shareSearch')"
                            :loading="searching"
                            :disabled="!searchEmail"
                            @click="onSearch"
                        />
                    </div>
                </UFormField>
            </div>

            <!-- Found user awaiting invite -->
            <div
                v-else
                class="flex items-center justify-between gap-2 py-2 px-3 bg-elevated rounded-lg"
            >
                <div class="flex items-center gap-2 min-w-0">
                    <UAvatar
                        :src="foundUser.photoUrl ?? undefined"
                        :alt="foundUser.displayName"
                        size="sm"
                    />
                    <span class="text-sm truncate">{{ foundUser.displayName }}</span>
                </div>
                <UButton
                    :label="t('wallets.shareInvite')"
                    :loading="inviting"
                    @click="onInvite(foundUser)"
                />
            </div>
        </div>
    </UCard>
</template>
