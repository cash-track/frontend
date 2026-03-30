<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Charge } from '@/api/models/charge'
import type { Wallet } from '@/api/models/wallet'
import type { Currency } from '@/api/models/currency'
import { deleteCharge } from '@/api/charges'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import { useAuthStore } from '@/stores/auth'
import ChargeEdit from './ChargeEdit.vue'
import TagBadge from '@/components/tags/TagBadge.vue'

const props = defineProps<{
    charge: Charge
    wallet: Wallet
    readOnly?: boolean
}>()

const emit = defineEmits<{
    updated: [charge: Charge]
    deleted: [chargeId: string]
    'tag-selected': [tagId: number]
}>()

const { t } = useI18n()
const { format } = useMoneyFormatter()
const authStore = useAuthStore()

const isExpanded = ref(false)
const isEdit = ref(false)
const deleting = ref(false)
const deleteConfirmOpen = ref(false)

const currency = computed<Currency | null>(() => props.wallet.defaultCurrency)

const formattedAmount = computed(() =>
    currency.value ? format(props.charge.amount, currency.value) : props.charge.amount.toString(),
)

const fullDateTime = computed(() => {
    const d = props.charge.dateTime
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
})

const chargeTime = computed(() => {
    const d = props.charge.dateTime
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function toggleExpand() {
    if (isEdit.value) return
    isExpanded.value = !isExpanded.value
}

function startEdit() {
    isEdit.value = true
    isExpanded.value = true
}

function cancelEdit() {
    isEdit.value = false
    isExpanded.value = false
}

function onUpdated(charge: Charge) {
    isEdit.value = false
    isExpanded.value = false
    emit('updated', charge)
}

async function onDeleteConfirmed() {
    deleting.value = true
    try {
        await deleteCharge(props.wallet.id, props.charge.id)
        deleteConfirmOpen.value = false
        emit('deleted', props.charge.id)
    } catch {
        // Silently fail — old code did the same
    } finally {
        deleting.value = false
    }
}

const actionItems = computed(() => [
    [
        {
            label: t('charges.edit'),
            icon: 'i-lucide-pencil',
            disabled: !authStore.isEmailConfirmed,
            onSelect: startEdit,
        },
        {
            label: t('charges.delete'),
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            disabled: !authStore.isEmailConfirmed || deleting.value,
            onSelect: () => { deleteConfirmOpen.value = true },
        },
    ],
])
</script>

<template>
    <div
        class="flex items-stretch border-b border-default transition-colors"
        :class="{ 'bg-elevated': isExpanded }"
    >
        <!-- Timeline column: fixed width, centered icon + vertical line -->
        <div class="flex flex-col items-center w-10 shrink-0 py-3">
            <div
                class="flex items-center justify-center size-7 rounded-full border-2 shrink-0"
                :class="charge.operation === '+' ? 'border-success text-success' : 'border-error text-error'"
            >
                <UIcon
                    :name="charge.operation === '+' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                    class="size-4"
                />
            </div>
            <div class="w-px flex-1 bg-default mt-1" />
        </div>

        <!-- Main content -->
        <div class="flex-1 min-w-0 py-3 pr-4">
            <div v-if="!isEdit">
                <!-- First row: amount + title + actions -->
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0 cursor-pointer" @click="toggleExpand">
                        <span
                            class="font-bold whitespace-nowrap"
                            :class="charge.operation === '+' ? 'text-success' : 'text-error'"
                        >{{ formattedAmount }}</span>
                        <span class="truncate text-default" :class="{ 'whitespace-normal': isExpanded }">
                            {{ charge.title.trim() }}
                        </span>
                    </div>

                    <div v-if="!readOnly" class="shrink-0">
                        <UDropdownMenu :items="actionItems">
                            <UButton
                                icon="i-lucide-ellipsis-vertical"
                                variant="ghost"
                                color="neutral"
                                size="xs"
                            />
                        </UDropdownMenu>
                    </div>
                </div>

                <!-- Second row: time + user + tags -->
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <UTooltip :text="fullDateTime" :arrow="true">
                        <span class="text-xs text-muted cursor-default">{{ chargeTime }}</span>
                    </UTooltip>
                    <UAvatar
                        v-if="charge.user"
                        :src="charge.user.photoUrl ?? undefined"
                        :alt="charge.user.displayName"
                        size="xs"
                    />
                    <template v-if="charge.tags.length > 0">
                        <TagBadge
                            v-for="tag in charge.tags"
                            :key="tag.id"
                            :tag="tag"
                            @click="emit('tag-selected', tag.id)"
                        />
                    </template>
                </div>

                <!-- Description (expanded) -->
                <div v-if="isExpanded && charge.description" class="mt-2 text-sm text-muted whitespace-pre-wrap">
                    {{ charge.description }}
                </div>
            </div>

            <!-- Edit form -->
            <ChargeEdit
                v-if="isEdit"
                :wallet="wallet"
                :charge="charge"
                @updated="onUpdated"
                @cancelled="cancelEdit"
            />
        </div>
        <!-- Delete confirmation modal -->
        <UModal v-model:open="deleteConfirmOpen" :title="t('charges.delete')">
            <template #body>
                <p class="text-sm text-muted">{{ t('charges.deletingConfirm') }}</p>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <UButton
                        variant="ghost"
                        :label="t('charges.cancel')"
                        :disabled="deleting"
                        @click="deleteConfirmOpen = false"
                    />
                    <UButton
                        color="error"
                        :label="t('charges.delete')"
                        :loading="deleting"
                        @click="onDeleteConfirmed"
                    />
                </div>
            </template>
        </UModal>
    </div>
</template>
