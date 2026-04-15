<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Charge } from '@/api/models/charge'
import type { Wallet, WalletShort } from '@/api/models/wallet'
import type { Tag as TagModel } from '@/api/models/tag'
import { deleteCharge } from '@/api/charges'
import { useAuthStore } from '@/stores/auth'
import ChargeEdit from './ChargeEdit.vue'
import Tag from '@/components/tags/Tag.vue'
import ConfirmModal from '@/components/Shared/ConfirmModal.vue'
import MoneyAmount from '@/components/Shared/MoneyAmount.vue'

const props = defineProps<{
    charge: Charge
    wallet: Wallet | WalletShort
    walletTags?: TagModel[]
    readOnly?: boolean
    selectable?: boolean
    selected?: boolean
}>()

const emit = defineEmits<{
    updated: [charge: Charge]
    deleted: [chargeId: string]
    'tag-selected': [tagId: number]
    'toggle-selected': [charge: Charge]
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const isExpanded = ref(false)
const isEdit = ref(false)
const deleting = ref(false)
const deleteConfirmOpen = ref(false)

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
    isExpanded.value = false
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

const isDropdownOpen = ref(false)

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
        class="group flex items-stretch transition-colors -mx-4 sm:mx-0 sm:px-4 sm:py-2"
        :class="[
            isExpanded || selected || isEdit ? 'bg-elevated' : 'hover:bg-muted',
            !isEdit ? 'cursor-pointer' : '',
        ]"
        @click="toggleExpand()"
    >
        <!-- Timeline column: fixed width, centered icon + vertical line -->
        <div class="flex flex-col items-center w-10 shrink-0 py-0 -my-2">
            <div class="w-px h-[20px] bg-black/10 dark:bg-white/10" />
            <button
                type="button"
                class="flex items-center justify-center size-7 rounded-full border-0 shrink-0 transition-colors"
                :class="[
                    selected
                        ? 'bg-primary border-primary text-white'
                        : charge.operation === '+' ? 'border-success text-success' : 'border-error text-error',
                    selectable && !isEdit ? 'cursor-pointer hover:ring-2 ring-primary ring-offset-1' : 'cursor-default',
                ]"
                :disabled="!selectable || isEdit"
                @click.stop="selectable && !isEdit ? emit('toggle-selected', charge) : undefined"
            >
                <UIcon v-if="selected" name="i-lucide-check" class="size-4" />
                <UIcon v-else :name="charge.operation === '+' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-6" />
            </button>
            <div class="w-px flex-1 bg-black/10 dark:bg-white/10" />
        </div>

        <!-- Main content -->
        <div class="flex-1 min-w-0 py-3 pr-4">
            <div v-if="!isEdit">
                <!-- First row: amount + title + actions -->
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <MoneyAmount
                            class="font-bold whitespace-nowrap text-neutral"
                            :amount="charge.amount"
                            :currency="wallet.defaultCurrency"
                        />
                        <span class="truncate text-default" :class="{ 'whitespace-normal': isExpanded }">
                            {{ charge.title.trim() }}
                        </span>
                    </div>

                    <div v-if="!readOnly" class="shrink-0" :class="{ 'invisible active:visible group-hover:visible': !selected && !isExpanded && !isDropdownOpen }" @click.stop>
                        <UDropdownMenu v-model:open="isDropdownOpen" :items="actionItems" arrow size="md" :content="{align: 'end', side: 'bottom'}" modal>
                            <UButton
                                icon="i-lucide-ellipsis-vertical"
                                variant="ghost"
                                color="neutral"
                                size="md"
                                :class="{ 'bg-elevated': isDropdownOpen }"
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
                        <Tag
                            v-for="tag in charge.tags"
                            :key="tag.id"
                            :tag="tag"
                            @click.stop="emit('tag-selected', tag.id)"
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
                :wallet-tags="walletTags"
                @updated="onUpdated"
                @cancelled="cancelEdit"
            />
        </div>
        <ConfirmModal
            v-model:open="deleteConfirmOpen"
            :title="t('charges.delete')"
            :description="t('charges.deletingConfirm')"
            :confirm-label="t('charges.delete')"
            :cancel-label="t('charges.cancel')"
            :loading="deleting"
            @confirm="onDeleteConfirmed"
        />
    </div>
</template>
