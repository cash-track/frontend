<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCharges, moveCharges, type GetChargesParams } from '@/api/charges'
import type { Charge } from '@/api/models/charge'
import type { Wallet } from '@/api/models/wallet'
import type { Tag } from '@/api/models/tag'
import type { Pagination } from '@/api/models/pagination'
import type { FilterState } from './ChargesFilter.vue'
import ChargeItem from './ChargeItem.vue'
import { useWalletsStore } from '@/stores/wallets'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import { useChargesGrouping } from '@/composables/useChargesGrouping'
import LoadErrorAlert from '@/components/Shared/LoadErrorAlert.vue'

const props = defineProps<{
    wallet: Wallet
    walletTags?: Tag[]
    filter?: FilterState
}>()

const emit = defineEmits<{
    'charge-updated': [charge: Charge]
    'charge-deleted': [chargeId: string]
    'charges-moved': []
    'tag-selected': [tagId: number]
}>()

const { t, locale } = useI18n()
const walletsStore = useWalletsStore()
const { format } = useMoneyFormatter()

const charges = ref<Charge[]>([])
const selectedCharges = ref<Charge[]>([])
const moveLoading = ref(false)
const moveError = ref<string | null>(null)
const pagination = ref<Pagination | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const lastError = ref<unknown>(null)
const currentPage = ref(1)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const { chargesGrouped } = useChargesGrouping(charges, t, locale)

const moveTargetWallets = computed(() =>
    walletsStore.activeWallets.filter(w => w.isActive && w.id !== props.wallet.id),
)

const moveDropdownItems = computed(() =>
    moveTargetWallets.value.map(w => ({
        label: w.defaultCurrency
            ? `${w.name} — ${format(w.totalAmount, w.defaultCurrency)}`
            : w.name,
        onSelect: () => onMoveTo(w),
    })),
)

function onToggleSelected(charge: Charge) {
    const index = selectedCharges.value.findIndex(c => c.id === charge.id)
    if (index === -1) {
        selectedCharges.value.push(charge)
    } else {
        selectedCharges.value.splice(index, 1)
    }
}

function isGroupSelected(groupCharges: Charge[]): boolean {
    return groupCharges.length > 0 && groupCharges.every(c => selectedCharges.value.some(s => s.id === c.id))
}

function onToggleGroup(groupCharges: Charge[]) {
    const allSelected = groupCharges.every(c => selectedCharges.value.some(s => s.id === c.id))
    if (allSelected) {
        const groupIds = new Set(groupCharges.map(c => c.id))
        selectedCharges.value = selectedCharges.value.filter(s => !groupIds.has(s.id))
    } else {
        const alreadySelected = new Set(selectedCharges.value.map(c => c.id))
        for (const charge of groupCharges) {
            if (!alreadySelected.has(charge.id)) {
                selectedCharges.value.push(charge)
            }
        }
    }
}

async function onMoveTo(targetWallet: Wallet) {
    if (!selectedCharges.value.length) return
    moveLoading.value = true
    moveError.value = null
    try {
        await moveCharges(
            props.wallet.id,
            targetWallet.id,
            selectedCharges.value.map(c => c.id),
        )
        const movedIds = new Set(selectedCharges.value.map(c => c.id))
        charges.value = charges.value.filter(c => !movedIds.has(c.id))
        selectedCharges.value = []
        emit('charges-moved')
    } catch {
        moveError.value = t('charges.moveError')
    } finally {
        moveLoading.value = false
    }
}

// Guards against stale responses: when wallets are switched quickly, an earlier
// request must never overwrite a newer one or clear the loading overlay early.
let loadToken = 0

async function loadCharges(page = 1, append = false) {
    const token = ++loadToken
    if (append) {
        loadingMore.value = true
    } else {
        loading.value = true
    }
    error.value = null
    lastError.value = null

    const params: GetChargesParams = { page }
    if (props.filter?.dateFrom) params['date-from'] = props.filter.dateFrom
    if (props.filter?.dateTo) params['date-to'] = props.filter.dateTo
    if (props.filter?.tags) params.tags = props.filter.tags

    try {
        const result = await getCharges(props.wallet.id, params)
        if (token !== loadToken) return
        if (append) {
            charges.value = [...charges.value, ...result.data]
        } else {
            charges.value = result.data
        }
        pagination.value = result.pagination
        currentPage.value = page
    } catch (err) {
        if (token !== loadToken) return
        error.value = append ? t('charges.loadingMoreError') : t('charges.loadingError')
        lastError.value = err
        if (!append) charges.value = []
    } finally {
        if (token === loadToken) {
            loading.value = false
            loadingMore.value = false
        }
    }
}

function loadMore() {
    if (loadingMore.value || !pagination.value?.hasNext) return
    loadCharges(currentPage.value + 1, true)
}

function onChargeUpdated(charge: Charge) {
    const index = charges.value.findIndex(c => c.id === charge.id)
    if (index !== -1) {
        charges.value = [...charges.value.slice(0, index), charge, ...charges.value.slice(index + 1)]
    }
    emit('charge-updated', charge)
}

function onChargeDeleted(chargeId: string) {
    charges.value = charges.value.filter(c => c.id !== chargeId)
    emit('charge-deleted', chargeId)
}

function onChargeCreated(charge: Charge) {
    // Insert at the correct position in the descending-dateTime list
    const index = charges.value.findIndex(c => c.dateTime < charge.dateTime)
    if (index === -1) {
        charges.value = [...charges.value, charge]
    } else {
        const next = [...charges.value]
        next.splice(index, 0, charge)
        charges.value = next
    }
}

function setupObserver() {
    if (observer) observer.disconnect()
    observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
            loadMore()
        }
    }, { rootMargin: '200px' })
}

function observeSentinel() {
    nextTick(() => {
        if (sentinelRef.value && observer) {
            observer.disconnect()
            observer.observe(sentinelRef.value)
        }
    })
}

// Combined into one watcher: on a wallet switch the parent resets the filter and
// sets the new wallet in the same tick, so two separate watchers would each fire a
// load. An array watch fires once when both change together → a single fetch.
watch([() => props.wallet.id, () => props.filter], () => {
    selectedCharges.value = []
    loadCharges(1)
}, { deep: true })

// Re-observe sentinel whenever loading finishes (sentinel enters DOM)
watch(loading, (val) => {
    if (!val) observeSentinel()
})
watch(loadingMore, (val) => {
    if (!val) observeSentinel()
})

onMounted(() => {
    setupObserver()
    loadCharges()
})

onUnmounted(() => {
    observer?.disconnect()
})

defineExpose({ onChargeCreated })
</script>

<template>
    <div class="relative">
        <!-- Loading overlay -->
        <div v-if="loading" class="absolute inset-0 z-10 flex items-start justify-center pt-8 bg-default/60 backdrop-blur-xs rounded-lg">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            <span class="ml-2 text-muted">{{ t('charges.loading') }}</span>
        </div>

        <!-- Error -->
        <LoadErrorAlert
            v-if="error && !loading"
            :title="error"
            :error="lastError"
            retryable
            class="my-3"
            @retry="loadCharges(1)"
        />

        <!-- Charges list -->
        <div v-if="!error">
            <!-- Move toolbar -->
            <div
                v-if="selectedCharges.length && moveTargetWallets.length"
                class="flex items-center gap-2 px-4 py-2 -mx-4 sm:mx-0 bg-elevated flex-wrap"
            >
                <UDropdownMenu :items="moveDropdownItems">
                    <UButton
                        variant="solid"
                        color="primary"
                        size="md"
                        icon="i-lucide-move"
                        :loading="moveLoading"
                    >
                        {{ t('charges.move') }}
                    </UButton>
                </UDropdownMenu>

                <UButton
                    variant="soft"
                    color="neutral"
                    size="md"
                    @click="selectedCharges = []"
                >
                    {{ t('charges.clearSelection') }}
                </UButton>

                <span class="text-sm text-muted ml-auto">
                    {{ t('charges.selectedCount', { count: selectedCharges.length }) }}
                </span>

                <UAlert
                    v-if="moveError"
                    color="error"
                    variant="soft"
                    icon="i-lucide-circle-alert"
                    :description="moveError"
                    close
                    class="basis-full"
                    @close="moveError = null"
                />
            </div>

            <template v-for="[group, groupCharges] in chargesGrouped" :key="group">
                <!-- Group header -->
                <div
                    class="group px-0 sm:px-4 py-2 -mx-4 sm:mx-0 transition-colors"
                    :class="isGroupSelected(groupCharges) ? 'bg-elevated' : (wallet.isActive ? 'hover:bg-muted' : '')"
                >
                    <div class="flex items-center gap-2">
                        <!-- Explicit select control (active wallets only) -->
                        <UTooltip v-if="wallet.isActive" :text="t('charges.selectGroup')" :arrow="true">
                            <button
                                type="button"
                                class="size-6 rounded-full border transition-colors shrink-0 cursor-pointer flex items-center justify-center ml-2"
                                :class="[
                                    isGroupSelected(groupCharges)
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-default text-muted hover:border-primary hover:text-primary',
                                    isGroupSelected(groupCharges) ? '' : 'invisible group-hover:visible active:visible pointer-coarse:visible',
                                ]"
                                :aria-label="t('charges.selectGroup')"
                                :aria-pressed="isGroupSelected(groupCharges)"
                                @click="onToggleGroup(groupCharges)"
                            >
                                <UIcon name="i-lucide-check" class="size-4" />
                            </button>
                        </UTooltip>
                        <!-- Decorative divider for inactive wallets -->
                        <div v-else class="w-6 shrink-0 h-px transition-colors bg-black/10 dark:bg-white/10 ml-2" />
                        <span class="text-sm text-muted">{{ group }}</span>
                        <div class="flex-1 h-px transition-colors" :class="isGroupSelected(groupCharges) ? '' : 'bg-black/10 dark:bg-white/10'" />
                    </div>
                </div>

                <ChargeItem
                    v-for="charge in groupCharges"
                    :key="charge.id"
                    :charge="charge"
                    :wallet="wallet"
                    :wallet-tags="walletTags"
                    :read-only="!wallet.isActive"
                    :selectable="wallet.isActive"
                    :selected="selectedCharges.some(c => c.id === charge.id)"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                    @tag-selected="(tagId) => emit('tag-selected', tagId)"
                    @toggle-selected="onToggleSelected"
                />
            </template>

            <!-- Empty state -->
            <div v-if="charges.length === 0" class="py-8 text-center text-muted">
                {{ t('charges.empty') }}
            </div>

            <!-- Infinite scroll sentinel -->
            <div ref="sentinelRef" class="h-1" />

            <!-- Loading more spinner -->
            <div v-if="loadingMore" class="flex justify-center py-4">
                <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
                <span class="ml-2 text-sm text-muted">{{ t('charges.loadingMore') }}</span>
            </div>
        </div>
    </div>
</template>
