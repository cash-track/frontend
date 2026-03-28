<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarDateTime } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

const props = defineProps<{
    modelValue: DateValue | null
    maxValue?: DateValue
}>()

const emit = defineEmits<{
    'update:modelValue': [value: DateValue | null]
}>()

const calendarValue = computed({
    get: () => props.modelValue,
    set: (val: DateValue | null) => {
        if (!val) return
        const existing = props.modelValue
        const hour = existing && 'hour' in existing ? existing.hour : 12
        const minute = existing && 'minute' in existing ? existing.minute : 0
        emit('update:modelValue', new CalendarDateTime(val.year, val.month, val.day, hour, minute))
    },
})

const hour = ref(props.modelValue && 'hour' in props.modelValue ? props.modelValue.hour : 12)
const minute = ref(props.modelValue && 'minute' in props.modelValue ? props.modelValue.minute : 0)

watch(() => props.modelValue, (val) => {
    if (val && 'hour' in val) {
        hour.value = val.hour
        minute.value = val.minute
    }
})

function onTimeChange() {
    const dt = props.modelValue
    if (!dt) return
    emit('update:modelValue', new CalendarDateTime(dt.year, dt.month, dt.day, hour.value, minute.value))
}

const maxHour = computed(() => {
    if (!props.maxValue || !props.modelValue || !('hour' in props.maxValue)) return 23
    const mv = props.modelValue
    const max = props.maxValue
    if (mv.year === max.year && mv.month === max.month && mv.day === max.day) {
        return 'hour' in max ? max.hour : 23
    }
    return 23
})

const maxMinute = computed(() => {
    if (!props.maxValue || !props.modelValue || !('hour' in props.maxValue)) return 59
    const mv = props.modelValue
    const max = props.maxValue
    if (mv.year === max.year && mv.month === max.month && mv.day === max.day && 'hour' in max && hour.value === max.hour) {
        return 'minute' in max ? max.minute : 59
    }
    return 59
})
</script>

<template>
    <div class="p-2">
        <UCalendar v-model="calendarValue" :max-value="maxValue" />
        <div class="flex items-center gap-2 mt-3 px-1">
            <UIcon name="i-lucide-clock" class="size-4 text-muted" />
            <input
                v-model.number="hour"
                type="number"
                min="0"
                :max="maxHour"
                class="w-12 rounded-md border border-default bg-default px-2 py-1 text-sm text-center"
                @change="onTimeChange"
            >
            <span class="text-muted font-bold">:</span>
            <input
                v-model.number="minute"
                type="number"
                min="0"
                :max="maxMinute"
                step="5"
                class="w-12 rounded-md border border-default bg-default px-2 py-1 text-sm text-center"
                @change="onTimeChange"
            >
        </div>
    </div>
</template>
