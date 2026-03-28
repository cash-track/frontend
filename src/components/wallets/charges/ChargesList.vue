<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCharges, type GetChargesParams } from '@/api/charges'
import type { Charge } from '@/api/models/charge'
import type { Wallet } from '@/api/models/wallet'
import type { Pagination } from '@/api/models/pagination'
import type { FilterState } from './ChargesFilter.vue'
import ChargeItem from './ChargeItem.vue'

const props = defineProps<{
    wallet: Wallet
    filter?: FilterState
}>()

const emit = defineEmits<{
    'charge-updated': [charge: Charge]
    'charge-deleted': [chargeId: string]
    'charge-created': []
    'tag-selected': [tagId: number]
}>()

const { t } = useI18n()

const charges = ref<Charge[]>([])
const pagination = ref<Pagination | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const chargesGrouped = computed(() => {
    const map = new Map<string, Charge[]>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const charge of charges.value) {
        const chargeDate = new Date(charge.dateTime)
        chargeDate.setHours(0, 0, 0, 0)

        const diff = Math.floor((today.getTime() - chargeDate.getTime()) / (1000 * 60 * 60 * 24))

        let group: string
        if (diff === 0) {
            group = ''
        } else {
            group = chargeDate.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })
        }

        let list = map.get(group)
        if (!list) {
            list = []
            map.set(group, list)
        }
        list.push(charge)
    }

    return map
})

async function loadCharges(page = 1, append = false) {
    if (append) {
        loadingMore.value = true
    } else {
        loading.value = true
    }
    error.value = null

    const params: GetChargesParams = { page }
    if (props.filter?.dateFrom) params['date-from'] = props.filter.dateFrom
    if (props.filter?.dateTo) params['date-to'] = props.filter.dateTo

    try {
        const result = await getCharges(props.wallet.id, params)
        if (append) {
            charges.value = [...charges.value, ...result.data]
        } else {
            charges.value = result.data
        }
        pagination.value = result.pagination
        currentPage.value = page
    } catch {
        error.value = append ? t('charges.loadingMoreError') : t('charges.loadingError')
        if (!append) charges.value = []
    } finally {
        loading.value = false
        loadingMore.value = false
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

function onChargeCreated() {
    loadCharges(1)
    emit('charge-created')
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

watch(() => props.filter, () => loadCharges(1), { deep: true })
watch(() => props.wallet.id, () => loadCharges(1))

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
        <div v-if="loading" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            <span class="ml-2 text-muted">{{ t('charges.loading') }}</span>
        </div>

        <!-- Error -->
        <UAlert
            v-if="error && !loading"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
            class="my-3"
        />

        <!-- Charges list -->
        <div v-if="!loading && !error">
            <template v-for="[group, groupCharges] in chargesGrouped" :key="group">
                <!-- Group header -->
                <div v-if="group" class="px-4 py-2 border-b border-default">
                    <span class="text-sm text-muted">{{ group }}</span>
                </div>

                <ChargeItem
                    v-for="charge in groupCharges"
                    :key="charge.id"
                    :charge="charge"
                    :wallet="wallet"
                    :read-only="!wallet.isActive"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                    @tag-selected="(tagId) => emit('tag-selected', tagId)"
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
