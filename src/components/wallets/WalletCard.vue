<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Wallet } from '@/api/models/wallet'
import type { User } from '@/api/models/user'
import { useTimeAgo } from '@/composables/useTimeAgo'
import { useProfileStore } from '@/stores/profile'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

const USERS_LIMIT = 4

const props = defineProps<{ wallet: Wallet }>()

const { t } = useI18n()
const router = useRouter()
const { timeAgo } = useTimeAgo()
const profileStore = useProfileStore()

const members = computed<User[]>(() => {
    const currentUser = profileStore.profile
    const result: User[] = []

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
        class="cursor-pointer rounded-lg border border-default hover:border-primary transition-colors"
        :class="wallet.isActive ? 'bg-default' : 'bg-elevated'"
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
        <div class="px-4 py-3 flex justify-between items-center border-t border-default">
            <span class="text-sm text-muted truncate">
                {{ wallet.defaultCurrency ? t(`currency.${wallet.defaultCurrency.code}`) : '' }}
                <template v-if="wallet.defaultCurrency">({{ wallet.defaultCurrency.code }})</template>
            </span>
            <MoneyAmount class="font-bold text-secondary whitespace-nowrap ml-2" :amount="wallet.totalAmount" :currency="wallet.defaultCurrency" />
        </div>

        <!-- Members + last updated -->
        <div class="px-4 py-2 border-t border-default flex justify-between items-center">
            <UAvatarGroup v-if="!hasOneMember" size="xs">
                <UTooltip
                    :arrow="true"
                    v-for="user in members"
                    :key="user.id"
                    :text="user.displayName"
                >
                    <UAvatar
                        :src="user.photoUrl ?? undefined"
                        :alt="user.displayName"
                        size="xs"
                    />
                </UTooltip>
                <UTooltip :arrow="true" v-if="hasMoreMembers" :text="t('wallets.moreMembers')">
                    <UAvatar :alt="t('wallets.moreMembers')" size="xs" />
                </UTooltip>
            </UAvatarGroup>
            <UTooltip :arrow="true" v-else-if="members[0]" :text="members[0].displayName">
                <UAvatar
                    :src="members[0].photoUrl ?? undefined"
                    :alt="members[0].displayName"
                    size="xs"
                />
            </UTooltip>
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
                <MoneyAmount
                    class="text-sm text-muted font-medium whitespace-nowrap ml-2"
                    :amount="charge.amount"
                    :currency="wallet.defaultCurrency"
                />
            </div>
        </div>
    </div>
</template>
