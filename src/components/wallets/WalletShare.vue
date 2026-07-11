<script setup lang="ts">
import { shallowRef, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getWalletUsers, shareWallet } from '@/api/wallets'
import { findUserByEmail, findUsersByCommonWallets } from '@/api/users'
import type { Wallet } from '@/api/models/wallet'
import type { User } from '@/api/models/user'
import { useApiErrors } from '@/composables/useApiErrors'
import WalletSharedMember from './WalletSharedMember.vue'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const props = defineProps<{ wallet: Wallet }>()

const { t } = useI18n()
const router = useRouter()
const { fieldErrors, generalError, generalErrorRaw, handleError, reset } = useApiErrors(['email'])

const members = shallowRef<User[]>([])
const commonUsers = shallowRef<User[]>([])
const loadFailed = shallowRef(false)
const loadLastError = shallowRef<unknown>(null)

const searchEmail = shallowRef('')
const foundUser = shallowRef<User | null>(null)
const searching = shallowRef(false)
const inviting = shallowRef(false)

const memberIds = computed(() => new Set(members.value.map(u => u.id)))

const filteredCommonUsers = computed(() =>
    commonUsers.value.filter(u => !memberIds.value.has(u.id) && u.id !== foundUser.value?.id),
)

async function load() {
    loadFailed.value = false
    loadLastError.value = null
    try {
        const [walletUsers, common] = await Promise.all([
            getWalletUsers(props.wallet.id),
            findUsersByCommonWallets(),
        ])
        members.value = walletUsers
        commonUsers.value = common
    } catch (error) {
        loadFailed.value = true
        loadLastError.value = error
    }
}

onMounted(load)

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
    reset()
    inviting.value = true
    try {
        await shareWallet(props.wallet.id, user.id)
        members.value = [...members.value, user]
        foundUser.value = null
        searchEmail.value = ''
    } catch (error) {
        handleError(error)
    } finally {
        inviting.value = false
    }
}

function onMemberDeleted(userId: number) {
    members.value = members.value.filter(u => u.id !== userId)
}

function onClose() {
    router.push({
        name: 'wallets.show',
        params: { walletID: props.wallet.id.toString(), nameForTitle: props.wallet.name },
    })
}
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center justify-between gap-2">
                <h2 class="font-semibold text-lg">
                    {{ t('wallets.shareTitle') }} <span class="font-bold">{{ wallet.name }}</span>
                </h2>
                <UTooltip :text="t('wallets.shareBack')" :arrow="true">
                    <UButton
                        icon="i-lucide-x"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        :aria-label="t('wallets.shareBack')"
                        @click="onClose"
                    />
                </UTooltip>
            </div>
        </template>

        <div class="space-y-4">
            <LoadErrorAlert
                v-if="loadFailed"
                :title="t('wallets.shareMembersLoadingError')"
                :error="loadLastError"
                retryable
                @retry="load()"
            />

            <!-- generalErrorRaw is only ever set by onInvite's non-422 catch, so the specific
                 shareInviteError message is always the right title here (never the generic
                 unknownError fallback) -->
            <LoadErrorAlert
                v-if="generalErrorRaw"
                :title="t('wallets.shareInviteError')"
                :error="generalErrorRaw"
            />
            <UAlert
                v-else-if="generalError"
                color="error"
                :description="generalError"
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
