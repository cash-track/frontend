<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { createTag, getWalletTags, searchWalletTags } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import { useApiErrors } from '@/composables/useApiErrors'
import { parseTagInput } from '@/shared/strings'
import TagChip from '@/components/tags/Tag.vue'

const props = defineProps<{
    walletId: number
    tags: Tag[]
    initialTags?: Tag[]
    disabled?: boolean
}>()

const emit = defineEmits<{
    selected: [tag: Tag]
}>()

const { t } = useI18n()
const { fieldErrors, generalError, reset: resetErrors, handleError } = useApiErrors()

const query = ref('')
const suggestions = ref<Tag[]>([])
const searchResults = ref<Tag[]>([])
const dropdownOpen = ref(false)
const loading = ref(false)
const debounceHandle = ref<ReturnType<typeof setTimeout> | null>(null)
const lastQuery = ref('')
const highlightedIndex = ref(-1)
const creating = ref(false)

const addedTagIds = computed(() => new Set(props.tags.map(tag => tag.id)))

const isSearchMode = computed(() => query.value.trim().length > 0)

const displayedTags = computed(() => {
    const source = isSearchMode.value ? searchResults.value : suggestions.value
    return source.filter(tag => !addedTagIds.value.has(tag.id))
})

const parsedQuery = computed(() => parseTagInput(query.value))

// Same rules as TagForm; hidden while a search is pending so an existing match isn't offered twice.
const canCreate = computed(() => {
    const { name } = parsedQuery.value
    if (loading.value || name.length < 3 || /\s/.test(name)) return false
    const lower = name.toLowerCase()
    return ![...searchResults.value, ...props.tags].some(tag => tag.name.toLowerCase() === lower)
})

const createLabel = computed(() =>
    [parsedQuery.value.icon, parsedQuery.value.name].filter(Boolean).join(' '),
)

const hasItems = computed(() => displayedTags.value.length > 0 || canCreate.value)

const createError = computed(
    () => fieldErrors.value.name?.[0] ?? fieldErrors.value.icon?.[0] ?? generalError.value,
)

function loadSuggestions() {
    if (props.initialTags !== undefined) {
        suggestions.value = props.initialTags
        return
    }
    getWalletTags(props.walletId)
        .then(tags => { suggestions.value = tags })
        .catch(() => {})
}

function onInput() {
    const q = query.value.trim()
    highlightedIndex.value = -1

    if (q === '') {
        searchResults.value = []
        dropdownOpen.value = hasItems.value
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
        searchWalletTags(props.walletId, q)
            .then(tags => { searchResults.value = tags })
            .catch(() => {})
            .finally(() => {
                loading.value = false
                dropdownOpen.value = hasItems.value
            })
    }, 300)
}

function onSelect(tag: Tag) {
    if (addedTagIds.value.has(tag.id)) return
    emit('selected', tag)
    query.value = ''
    searchResults.value = []
    highlightedIndex.value = -1
    // Deferred so `props.tags` has round-tripped and displayedTags sees the pick (#155).
    nextTick(() => { dropdownOpen.value = hasItems.value })
}

async function onCreate() {
    if (creating.value || !canCreate.value) return
    const { name, icon } = parsedQuery.value
    resetErrors()
    creating.value = true
    try {
        const tag = await createTag({ name, icon })
        suggestions.value = [...suggestions.value, tag]
        onSelect(tag)
    } catch (err) {
        handleError(err)
    } finally {
        creating.value = false
    }
}

function onKeyDown(e: KeyboardEvent) {
    if (!dropdownOpen.value || displayedTags.value.length === 0) return

    if (e.key === 'ArrowDown') {
        e.preventDefault()
        highlightedIndex.value = Math.min(highlightedIndex.value + 1, displayedTags.value.length - 1)
    } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
    } else if (e.key === 'Enter' && highlightedIndex.value >= 0) {
        e.preventDefault()
        onSelect(displayedTags.value[highlightedIndex.value])
    } else if (e.key === 'Escape') {
        dropdownOpen.value = false
    }
}

function onFocus() {
    dropdownOpen.value = hasItems.value
}

function onBlur() {
    setTimeout(() => { dropdownOpen.value = false }, 200)
}

function reset() {
    query.value = ''
    searchResults.value = []
    dropdownOpen.value = false
    highlightedIndex.value = -1
    loadSuggestions()
}

watch(query, (val) => {
    resetErrors()
    if (val === '') {
        searchResults.value = []
        highlightedIndex.value = -1
        dropdownOpen.value = hasItems.value
        return
    }
    onInput()
})

watch(() => props.walletId, () => loadSuggestions())
watch(() => props.initialTags, (tags) => {
    if (tags !== undefined) suggestions.value = tags
}, { deep: true })

onMounted(() => loadSuggestions())

defineExpose({ reset })
</script>

<template>
    <div class="relative">
        <UInput
            v-model="query"
            :placeholder="t('tags.tags')"
            :disabled="disabled"
            autocomplete="off"
            class="w-full"
            size="lg"
            @focus="onFocus"
            @blur="onBlur"
            @keydown="onKeyDown"
        >
            <template #trailing>
                <UIcon v-if="loading" name="i-lucide-loader-circle" class="animate-spin size-4 shrink-0 text-dimmed" />
            </template>
        </UInput>
        <div
            v-if="dropdownOpen && hasItems"
            class="absolute z-10 -mt-1 border-t-0 rounded-t-none w-full rounded-md border border-default bg-default shadow-lg p-2 flex gap-1 overflow-x-auto"
        >
            <TagChip
                v-for="(tag, index) in displayedTags"
                :key="tag.id"
                :tag="tag"
                :highlighted="index === highlightedIndex"
                @mousedown.prevent="onSelect(tag)"
            />
            <button
                v-if="canCreate"
                type="button"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border border-dashed border-default hover:border-gray-400 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                :disabled="creating"
                :aria-label="`${t('tags.create')} ${createLabel}`"
                @mousedown.prevent="onCreate"
            >
                <UIcon :name="creating ? 'i-lucide-loader-circle' : 'i-lucide-plus'" class="size-3.5" :class="{ 'animate-spin': creating }" />
                {{ createLabel }}
            </button>
        </div>
        <p v-if="createError" class="mt-1 text-sm text-error">{{ createError }}</p>
        <p v-if="dropdownOpen && !hasItems && !loading && query.trim()" class="absolute z-10 mt-1 w-full rounded-md border border-default bg-default shadow-lg p-3 text-sm text-muted">
            {{ t('tags.autocompleteHint') }}
        </p>
    </div>
</template>
