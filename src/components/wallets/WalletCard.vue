<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Wallet } from '@/api/models/wallet'
import type { UserShort } from '@/api/models/user'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import { useTimeAgo } from '@/composables/useTimeAgo'
import { useProfileStore } from '@/stores/profile'

const USERS_LIMIT = 4

const props = defineProps<{ wallet: Wallet }>()

const { t } = useI18n()
const router = useRouter()
const { format } = useMoneyFormatter()
const { timeAgo } = useTimeAgo()
const profileStore = useProfileStore()

const members = computed<UserShort[]>(() => {
    const currentUser = profileStore.profile
    const result: UserShort[] = []

    if (currentUser) {
        result.push(currentUser)
    }

    for (const user of props.wallet.users) {
        if (user.id === currentUser?.id) continue
        result.push(user)
        if (result.length >= USERS_LIMIT) break
    }

    return result
})

const hasOneMember = computed(() => props.wallet.users.length === 1)
const hasMoreMembers = computed(() => props.wallet.users.length > USERS_LIMIT)

const formattedBalance = computed(() =>
    props.wallet.defaultCurrency
        ? format(props.wallet.totalAmount, props.wallet.defaultCurrency)
        : props.wallet.totalAmount.toString(),
)

const lastUpdated = computed(() => timeAgo(props.wallet.updatedAt))

function navigate() {
    router.push({
        name: 'wallets.show',
        params: { walletID: props.wallet.id.toString() },
    })
}
</script>

<template>
    <div
        class="cursor-pointer rounded-lg border border-default bg-elevated hover:border-primary transition-colors"
        @click="navigate"
    >
        <!-- Header: name + status badge -->
        <div class="p-4">
            <div class="flex justify-between items-start gap-2">
                <h3 class="font-semibold text-lg truncate">{{ wallet.name }}</h3>
                <UBadge v-if="wallet.isActive" color="primary" variant="subtle" class="shrink-0">
                    {{ t('wallets.active') }}
                </UBadge>
                <UBadge v-else-if="wallet.isArchived" color="neutral" variant="subtle" class="shrink-0">
                    {{ t('wallets.archived') }}
                </UBadge>
            </div>
        </div>

        <!-- Balance row -->
        <div class="px-4 pb-3 flex justify-between items-center border-t border-default">
            <span class="text-sm text-muted truncate">
                {{ wallet.defaultCurrency ? t(`currency.${wallet.defaultCurrency.code}`) : '' }}
                <template v-if="wallet.defaultCurrency">({{ wallet.defaultCurrency.code }})</template>
            </span>
            <span class="font-bold text-primary whitespace-nowrap ml-2">
                {{ formattedBalance }}
            </span>
        </div>

        <!-- Members + last updated -->
        <div class="px-4 py-2 border-t border-default flex justify-between items-center">
            <UAvatarGroup v-if="!hasOneMember" size="xs">
                <UAvatar
                    v-for="user in members"
                    :key="user.id"
                    :src="user.photoUrl ?? undefined"
                    :alt="`${user.name}${user.lastName ? ' ' + user.lastName : ''}`"
                    size="xs"
                />
                <UAvatar
                    v-if="hasMoreMembers"
                    :alt="t('wallets.moreMembers')"
                    size="xs"
                />
            </UAvatarGroup>
            <UAvatar
                v-else-if="members[0]"
                :src="members[0].photoUrl ?? undefined"
                :alt="`${members[0].name}${members[0].lastName ? ' ' + members[0].lastName : ''}`"
                size="xs"
            />
            <div v-else />

            <span class="text-xs text-muted flex items-center gap-1">
                {{ lastUpdated }}
                <UIcon name="i-lucide-clock" class="size-3" />
            </span>
        </div>

        <!-- Latest charges -->
        <div v-if="wallet.latestCharges.length > 0" class="border-t border-default">
            <div
                v-for="charge in wallet.latestCharges"
                :key="charge.id"
                class="px-4 py-2 flex justify-between items-center border-b border-default last:border-b-0"
            >
                <span class="text-sm text-muted flex items-center gap-1 min-w-0">
                    <UIcon
                        :name="charge.operation === '+' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                        :class="charge.operation === '+' ? 'text-success' : 'text-error'"
                        class="size-3 shrink-0"
                    />
                    <span class="truncate">{{ charge.title }}</span>
                </span>
                <span
                    v-if="wallet.defaultCurrency"
                    class="text-sm text-muted font-medium whitespace-nowrap ml-2"
                >
                    {{ format(charge.amount, wallet.defaultCurrency) }}
                </span>
            </div>
        </div>
    </div>
</template>
