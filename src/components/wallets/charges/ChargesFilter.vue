<script setup lang="ts">
import { shallowRef, watch, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DateValue } from '@internationalized/date'

export interface FilterState {
    dateFrom: string
    dateTo: string
    tags?: string
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
            <UBadge v-if="dateFrom" color="secondary" variant="soft" class="gap-1 overflow-hidden" size="lg">
                {{ t('charges.filterFrom') }}: {{ toDateString(dateFrom) }}
                <button type="button" class="hover:bg-secondary/20 dark:hover:bg-secondary/20 inline-block h-fit w-fit -my-1.5 p-1.5 -mr-2 cursor-pointer" @click="resetDateFrom">
                    <UIcon name="i-lucide-x" class="size-4" />
                </button>
            </UBadge>
            <UBadge v-if="dateTo" color="secondary" variant="soft" class="gap-1 overflow-hidden" size="lg">
                {{ t('charges.filterTo') }}: {{ toDateString(dateTo) }}
                <button type="button" class="hover:bg-secondary/20 dark:hover:bg-secondary/20 inline-block h-fit w-fit -my-1.5 p-1.5 -mr-2 cursor-pointer" @click="resetDateTo">
                    <UIcon name="i-lucide-x" class="size-4" />
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
