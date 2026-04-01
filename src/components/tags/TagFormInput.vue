<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWalletTags, searchWalletTags } from '@/api/tags'
import type { Tag } from '@/api/models/tag'
import TagChip from '@/components/tags/Tag.vue'

const props = defineProps<{
    walletId: number
    tags: Tag[]
    disabled?: boolean
}>()

const emit = defineEmits<{
    selected: [tag: Tag]
}>()

const { t } = useI18n()

const query = ref('')
const suggestions = ref<Tag[]>([])
const searchResults = ref<Tag[]>([])
const dropdownOpen = ref(false)
const loading = ref(false)
const debounceHandle = ref<ReturnType<typeof setTimeout> | null>(null)
const lastQuery = ref('')
const highlightedIndex = ref(-1)

const addedTagIds = computed(() => new Set(props.tags.map(tag => tag.id)))

const isSearchMode = computed(() => query.value.trim().length > 0)

const displayedTags = computed(() => {
    const source = isSearchMode.value ? searchResults.value : suggestions.value
    return source.filter(tag => !addedTagIds.value.has(tag.id))
})

function loadSuggestions() {
    getWalletTags(props.walletId)
        .then(tags => { suggestions.value = tags })
        .catch(() => {})
}

function onInput() {
    const q = query.value.trim()
    highlightedIndex.value = -1

    if (q === '') {
        searchResults.value = []
        dropdownOpen.value = displayedTags.value.length > 0
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
            .then(tags => {
                searchResults.value = tags
                dropdownOpen.value = displayedTags.value.length > 0
            })
            .catch(() => {})
            .finally(() => { loading.value = false })
    }, 300)
}

function onSelect(tag: Tag) {
    if (addedTagIds.value.has(tag.id)) return
    emit('selected', tag)
    query.value = ''
    searchResults.value = []
    highlightedIndex.value = -1
    dropdownOpen.value = false
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
    dropdownOpen.value = displayedTags.value.length > 0
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
    if (val === '') {
        searchResults.value = []
        highlightedIndex.value = -1
        dropdownOpen.value = displayedTags.value.length > 0
        return
    }
    onInput()
})

watch(() => props.walletId, () => loadSuggestions())

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
            :loading="loading"
            @focus="onFocus"
            @blur="onBlur"
            @keydown="onKeyDown"
        />
        <div
            v-if="dropdownOpen && displayedTags.length > 0"
            class="absolute z-10 mt-1 w-full rounded-md border border-default bg-default shadow-lg p-2 flex flex-wrap gap-1 max-h-40 overflow-y-auto"
        >
            <TagChip
                v-for="(tag, index) in displayedTags"
                :key="tag.id"
                :tag="tag"
                :highlighted="index === highlightedIndex"
                @mousedown.prevent="onSelect(tag)"
            />
        </div>
        <p v-if="dropdownOpen && displayedTags.length === 0 && !loading && query.trim()" class="absolute z-10 mt-1 w-full rounded-md border border-default bg-default shadow-lg p-3 text-sm text-muted">
            {{ t('tags.autocompleteHint') }}
        </p>
    </div>
</template>
