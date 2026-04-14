<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Wallet } from '@/api/models/wallet'
import type { WalletTotal } from '@/api/models/wallet'
import type { User } from '@/api/models/user'
import { activateWallet, disableWallet, archiveWallet, unarchiveWallet, deleteWallet } from '@/api/wallets'
import { useAuthStore } from '@/stores/auth'
import { useNotifications } from '@/composables/useNotifications'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'
import TotalsRow from '@/components/Shared/TotalsRow.vue'

const props = defineProps<{
    wallet: Wallet
    totals: WalletTotal | null
    users: User[]
}>()

const deleteConfirmOpen = ref(false)
const deleting = ref(false)

const emit = defineEmits<{
    'wallet-changed': []
}>()

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { notifyError } = useNotifications()

const actionItems = computed(() => [
    [
        {
            label: t('wallets.share'),
            icon: 'i-lucide-users',
            onSelect: () => router.push({
                name: 'wallets.share',
                params: { walletID: props.wallet.id.toString(), nameForTitle: props.wallet.name },
            }),
        },
    ],
    [
        ...(!props.wallet.isActive ? [{
            label: t('wallets.activate'),
            icon: 'i-lucide-play',
            disabled: !authStore.isEmailConfirmed,
            onSelect: onActivate,
        }] : [{
            label: t('wallets.disable'),
            icon: 'i-lucide-pause',
            disabled: !authStore.isEmailConfirmed,
            onSelect: onDisable,
        }]),
        ...(!props.wallet.isArchived ? [{
            label: t('wallets.toArchive'),
            icon: 'i-lucide-archive',
            disabled: !authStore.isEmailConfirmed,
            onSelect: onArchive,
        }] : [{
            label: t('wallets.unArchive'),
            icon: 'i-lucide-archive-restore',
            disabled: !authStore.isEmailConfirmed,
            onSelect: onUnArchive,
        }]),
    ],
    [
        {
            label: t('wallets.delete'),
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            disabled: !authStore.isEmailConfirmed,
            onSelect: () => { deleteConfirmOpen.value = true },
        },
    ],
])

async function onActivate() {
    try {
        await activateWallet(props.wallet.id)
        emit('wallet-changed')
    } catch { notifyError(t('wallets.loadingError')) }
}

async function onDisable() {
    try {
        await disableWallet(props.wallet.id)
        emit('wallet-changed')
    } catch { notifyError(t('wallets.loadingError')) }
}

async function onArchive() {
    try {
        await archiveWallet(props.wallet.id)
        emit('wallet-changed')
    } catch { notifyError(t('wallets.loadingError')) }
}

async function onUnArchive() {
    try {
        await unarchiveWallet(props.wallet.id)
        emit('wallet-changed')
    } catch { notifyError(t('wallets.loadingError')) }
}

async function onDeleteConfirmed() {
    deleting.value = true
    try {
        await deleteWallet(props.wallet.id)
        deleteConfirmOpen.value = false
        router.push({ name: 'wallets' })
    } catch {
        notifyError(t('wallets.loadingError'))
    } finally {
        deleting.value = false
    }
}
</script>

<template>
    <div>
        <!-- Status badges -->
        <div class="flex gap-2 mb-2">
            <UBadge v-if="wallet.isActive" color="primary" variant="subtle">{{ t('wallets.active') }}</UBadge>
            <UBadge v-if="wallet.isArchived" color="neutral" variant="subtle">{{ t('wallets.archived') }}</UBadge>
        </div>

        <!-- Name + actions -->
        <div class="flex justify-between items-start gap-4">
            <h2 class="text-2xl font-bold">{{ wallet.name }}</h2>
            <div class="flex gap-2 shrink-0">
                <UButton
                    :to="{ name: 'wallets.edit', params: { walletID: wallet.id.toString(), nameForTitle: wallet.name } }"
                    icon="i-lucide-pencil"
                    color="primary"
                    :disabled="!authStore.isEmailConfirmed"
                >
                    {{ t('wallets.edit') }}
                </UButton>
                <UDropdownMenu :items="actionItems">
                    <UButton icon="i-lucide-ellipsis-vertical" color="primary" variant="outline" />
                </UDropdownMenu>
            </div>
        </div>

        <!-- Members -->
        <div v-if="users.length > 0" class="flex flex-wrap gap-3 mt-3">
            <div v-for="user in users" :key="user.id" class="flex items-center gap-1.5">
                <UAvatar
                    :src="user.photoUrl ?? undefined"
                    :alt="user.displayName"
                    size="sm"
                />
                <span class="text-sm text-muted">{{ user.displayName }}</span>
            </div>
        </div>

        <!-- Totals -->
        <TotalsRow
            v-if="totals"
            :total-amount="totals.totalAmount"
            :income-amount="totals.totalIncomeAmount"
            :expense-amount="totals.totalExpenseAmount"
            :currency="wallet.defaultCurrency"
        />
        <ConfirmModal
            v-model:open="deleteConfirmOpen"
            :title="t('wallets.delete')"
            :description="t('wallets.deletingConfirm')"
            :confirm-label="t('wallets.delete')"
            :cancel-label="t('wallets.cancel')"
            :loading="deleting"
            @confirm="onDeleteConfirmed"
        />
    </div>
</template>
