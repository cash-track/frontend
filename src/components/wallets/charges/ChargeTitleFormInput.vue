<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getChargeTitles } from '@/api/charges'
import { getTagSuggestions } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import type { ChargeTitleSuggestion } from '@/api/models/charge'
import TagChip from '@/components/tags/Tag.vue'

const props = defineProps<{
    modelValue: string
    tags: Tag[]
    disabled?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
    'tag-selected': [tag: Tag]
    'dropdown-open-change': [open: boolean]
}>()

const { t } = useI18n()

const localValue = ref(props.modelValue)
const dropdownOpen = ref(false)
const loading = ref(false)
const debounceHandle = ref<ReturnType<typeof setTimeout> | null>(null)
const lastQuery = ref('')
const highlightedIndex = ref(-1)

// Guards against stale responses: an earlier request must never overwrite a newer one.
let loadToken = 0

// Sync local → parent + trigger autocomplete
watch(localValue, (val) => {
    emit('update:modelValue', val)
    doAutocomplete(val)
})

const tagSuggestions = ref<Tag[]>([])
const titleSuggestions = ref<ChargeTitleSuggestion[]>([])

const addedTagIds = computed(() => new Set(props.tags.map(tag => tag.id)))

const filteredTagSuggestions = computed(() =>
    tagSuggestions.value.filter(tag => !addedTagIds.value.has(tag.id)),
)

const filteredTitleSuggestions = computed(() =>
    titleSuggestions.value.map(item => ({
        ...item,
        selected: props.modelValue.trim().toLowerCase() === item.title.toLowerCase(),
    })),
)

// Combined flat list for keyboard navigation
const allItems = computed(() => {
    const items: Array<{ type: 'tag'; tag: Tag } | { type: 'title'; title: string }> = []
    for (const tag of filteredTagSuggestions.value) {
        items.push({ type: 'tag', tag })
    }
    for (const item of filteredTitleSuggestions.value) {
        items.push({ type: 'title', title: item.title })
    }
    return items
})

const listboxId = 'charge-title-listbox'

const activeDescendantId = computed(() => {
    if (highlightedIndex.value < 0 || !dropdownOpen.value) return undefined
    const item = allItems.value[highlightedIndex.value]
    if (!item) return undefined
    if (item.type === 'tag') return `charge-title-option-tag-${item.tag.id}`
    return `charge-title-option-title-${highlightedIndex.value}`
})

const hasResults = computed(() =>
    filteredTagSuggestions.value.length > 0 || filteredTitleSuggestions.value.length > 0,
)

function doAutocomplete(value: string) {
    const q = value.trim()
    highlightedIndex.value = -1
    if (q === '') {
        dropdownOpen.value = false
        return
    }

    if (lastQuery.value === q) return
    lastQuery.value = q

    if (debounceHandle.value !== null) {
        clearTimeout(debounceHandle.value)
    }

    loading.value = true
    debounceHandle.value = setTimeout(() => {
        debounceHandle.value = null
        const token = ++loadToken
        Promise.all([
            getTagSuggestions(q),
            getChargeTitles(q),
        ])
            .then(([tags, titles]) => {
                if (token !== loadToken) return
                tagSuggestions.value = tags
                titleSuggestions.value = titles
                dropdownOpen.value = hasResults.value
            })
            .catch(() => {})
            .finally(() => {
                if (token === loadToken) loading.value = false
            })
    }, 300)
}

function onTagSelect(tag: Tag) {
    if (addedTagIds.value.has(tag.id)) return
    emit('tag-selected', tag)
    doAutocomplete(props.modelValue)
}

function onTitleSelect(title: string) {
    localValue.value = title
    dropdownOpen.value = false
}

function onKeyDown(e: KeyboardEvent) {
    if (!dropdownOpen.value || allItems.value.length === 0) return

    if (e.key === 'ArrowDown') {
        e.preventDefault()
        highlightedIndex.value = Math.min(highlightedIndex.value + 1, allItems.value.length - 1)
    } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
    } else if (e.key === 'Enter' && highlightedIndex.value >= 0) {
        e.preventDefault()
        const item = allItems.value[highlightedIndex.value]
        if (item.type === 'tag') {
            onTagSelect(item.tag)
        } else {
            onTitleSelect(item.title)
        }
    } else if (e.key === 'Escape') {
        dropdownOpen.value = false
    }
}

function onFocus() {
    if (hasResults.value) {
        dropdownOpen.value = true
    }
}

function onBlur() {
    setTimeout(() => { dropdownOpen.value = false }, 200)
}

function reset() {
    ++loadToken
    if (debounceHandle.value !== null) {
        clearTimeout(debounceHandle.value)
        debounceHandle.value = null
    }
    loading.value = false
    tagSuggestions.value = []
    titleSuggestions.value = []
    dropdownOpen.value = false
    lastQuery.value = ''
    highlightedIndex.value = -1
}

watch(() => props.modelValue, (val) => {
    if (val === '') reset()
    if (val !== localValue.value) localValue.value = val
})

// Lets ancestors (e.g. a UCollapsible with overflow-hidden) temporarily allow
// overflow while the suggestions listbox is open, so it isn't clipped.
watch(dropdownOpen, (open) => {
    emit('dropdown-open-change', open)
})

defineExpose({ reset })
</script>

<template>
    <div class="relative">
        <UInput
            v-model="localValue"
            :placeholder="t('charges.title')"
            :disabled="disabled"
            autocomplete="off"
            class="w-full"
            size="lg"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="dropdownOpen"
            :aria-controls="listboxId"
            :aria-activedescendant="activeDescendantId"
            @focus="onFocus"
            @blur="onBlur"
            @keydown="onKeyDown"
        >
            <template #trailing>
                <UIcon v-if="loading" name="i-lucide-loader-circle" class="animate-spin size-4 shrink-0 text-dimmed" />
            </template>
        </UInput>
        <div
            v-if="dropdownOpen"
            :id="listboxId"
            role="listbox"
            class="absolute z-10 -mt-1 border-t-0 rounded-t-none w-full rounded-md border border-default bg-default shadow-lg max-h-60 overflow-y-auto"
        >
            <!-- Tag suggestions -->
            <div v-if="filteredTagSuggestions.length > 0" class="p-2 flex gap-1 border-b border-default overflow-x-auto">
                <TagChip
                    v-for="(tag, index) in filteredTagSuggestions"
                    :key="tag.id"
                    :id="`charge-title-option-tag-${tag.id}`"
                    role="option"
                    :aria-selected="index === highlightedIndex"
                    :tag="tag"
                    :highlighted="index === highlightedIndex"
                    @mousedown.prevent="onTagSelect(tag)"
                />
            </div>
            <!-- Title suggestions -->
            <div v-if="filteredTitleSuggestions.length > 0">
                <button
                    v-for="(item, i) in filteredTitleSuggestions"
                    :key="item.title"
                    :id="`charge-title-option-title-${filteredTagSuggestions.length + i}`"
                    type="button"
                    role="option"
                    :aria-selected="(filteredTagSuggestions.length + i) === highlightedIndex"
                    class="w-full text-left px-3 py-2 text-sm flex justify-between items-center transition-colors"
                    :class="[
                        item.selected ? 'bg-elevated' : '',
                        (filteredTagSuggestions.length + i) === highlightedIndex ? 'bg-elevated ring-1 ring-inset ring-primary' : 'hover:bg-elevated',
                    ]"
                    @mousedown.prevent="onTitleSelect(item.title)"
                >
                    <span>{{ item.title }}</span>
                    <UBadge variant="subtle" color="neutral" size="xs">{{ item.count }}</UBadge>
                </button>
            </div>
        </div>
    </div>
</template>
