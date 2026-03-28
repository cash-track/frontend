<script setup lang="ts">
import { shallowRef, watch, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DateValue } from '@internationalized/date'

export interface FilterState {
    dateFrom: string
    dateTo: string
}

const emit = defineEmits<{
    'filter-change': [filter: FilterState]
}>()

const { t } = useI18n()

const dateFrom = shallowRef<DateValue | null>(null)
const dateTo = shallowRef<DateValue | null>(null)

const dateFromRef = useTemplateRef('dateFromRef')
const dateToRef = useTemplateRef('dateToRef')

function toDateString(d: DateValue | null): string {
    if (!d) return ''
    return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

function emitChange() {
    emit('filter-change', {
        dateFrom: toDateString(dateFrom.value),
        dateTo: toDateString(dateTo.value),
    })
}

function resetDateFrom() {
    dateFrom.value = null
}

function resetDateTo() {
    dateTo.value = null
}

watch(dateFrom, emitChange)
watch(dateTo, emitChange)
</script>

<template>
    <div class="flex flex-col sm:flex-row gap-3 items-start">
        <!-- Active filter badges -->
        <div class="flex flex-wrap gap-2 items-center sm:w-1/3">
            <UBadge v-if="dateFrom" color="primary" variant="subtle" class="gap-1">
                {{ t('charges.filterFrom') }}: {{ toDateString(dateFrom) }}
                <button type="button" class="hover:opacity-70" @click="resetDateFrom">
                    <UIcon name="i-lucide-x" class="size-3" />
                </button>
            </UBadge>
            <UBadge v-if="dateTo" color="primary" variant="subtle" class="gap-1">
                {{ t('charges.filterTo') }}: {{ toDateString(dateTo) }}
                <button type="button" class="hover:opacity-70" @click="resetDateTo">
                    <UIcon name="i-lucide-x" class="size-3" />
                </button>
            </UBadge>
        </div>

        <!-- Date inputs with calendar popups -->
        <div class="flex flex-col sm:flex-row gap-2 sm:w-2/3">
            <UInputDate
                ref="dateFromRef"
                v-model="dateFrom"
                class="flex-1"
            >
                <template #trailing>
                    <UPopover>
                        <UButton
                            color="neutral"
                            variant="link"
                            size="sm"
                            icon="i-lucide-calendar"
                            class="px-0"
                        />
                        <template #content>
                            <UCalendar v-model="dateFrom" class="p-2" />
                        </template>
                    </UPopover>
                </template>
            </UInputDate>
            <UInputDate
                ref="dateToRef"
                v-model="dateTo"
                class="flex-1"
            >
                <template #trailing>
                    <UPopover>
                        <UButton
                            color="neutral"
                            variant="link"
                            size="sm"
                            icon="i-lucide-calendar"
                            class="px-0"
                        />
                        <template #content>
                            <UCalendar v-model="dateTo" class="p-2" />
                        </template>
                    </UPopover>
                </template>
            </UInputDate>
        </div>
    </div>
</template>
