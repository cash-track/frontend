<template>
    <b-form-group
        label-for="tags-autocomplete"
        class="autocomplete-root"
        :invalid-feedback="validationMessage"
        :state="validationState"
        v-click-outside="onInputInactive"
    >
        <b-spinner small class="loader" v-if="autocompleteLoading"></b-spinner>
        <b-input
            type="text"
            id="tags-autocomplete"
            required
            :placeholder="$t('tags.tags')"
            v-model="name"
            :disabled="disabled"
            :state="validationState"
            @keyup="onAutocomplete"
            @focusin="onInputActive"
            autocomplete="off"
        ></b-input>
        <b-list-group class="autocomplete" v-show="suggestionActive">
            <b-list-group-item v-if="autocompleteActive">
                <span v-if="autocompleteFiltered.length" class="list-container">
                    <tag v-for="tag of autocompleteFiltered"
                         :tag="tag"
                         :key="tag.id"
                         @selected="onSelected"
                    ></tag>
                </span>
                <create-tag :name="nameAutocomplete"
                            v-if="canCreate"
                            @selected="onSelected"
                ></create-tag>
                <span v-else-if="!autocompleteFiltered.length"
                      class="text-notice text-muted"
                >{{ $t('tags.autocompleteHint') }}</span>
            </b-list-group-item>
            <b-list-group-item v-if="!autocompleteActive">
                <div v-if="suggestionsFiltered.length">
                    <tag v-for="tag of suggestionsFiltered"
                         :tag="tag"
                         :key="tag.id"
                         @selected="onSelected"
                    ></tag>
                </div>
                <span v-else class="text-notice text-muted">{{ $t('tags.autocompleteHint') }}</span>
            </b-list-group-item>
        </b-list-group>
    </b-form-group>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import { walletTagSearch, walletTagsGet } from '@/api/wallets';
import { TagInterface, TagsResponseInterface } from '@/api/tags';
import Tag from '@/components/tags/Tag.vue';
import CreateTag, { parseEmoji } from '@/components/tags/CreateTag.vue';

@Component({
    components: {Tag, CreateTag}
})
export default class TagFormInput extends Vue {
    @Prop({
        required: true,
        type: Number,
    })
    walletId!: number

    @Prop({
        required: true,
        type: Array,
        default: [],
    })
    tags!: Array<TagInterface>

    @Prop({
        required: false,
        type: Boolean,
        default: false,
    })
    disabled!: boolean

    @Prop({
        required: false,
        type: Boolean,
        default: null,
    })
    validationState!: boolean|null

    @Prop({
        required: false,
        type: String,
        default: null,
    })
    validationMessage!: string|null

    @Prop({
        required: false,
        type: Boolean,
        default: false,
    })
    resetState!: boolean|null

    name = ''

    suggestions: Array<TagInterface> = []
    suggestionActive = false

    autocomplete: Array<TagInterface> = []
    autocompleteActive = false
    autocompleteLoading = false
    autocompleteDebounceHandle: number|null = null
    lastAutocompleteQuery = ''

    get suggestionsFiltered(): Array<TagInterface> {
        const addedTags = this.tags.map(tag => tag.name)

        return this.suggestions.filter(tag => addedTags.indexOf(tag.name) === -1)
    }

    get autocompleteFiltered(): Array<TagInterface> {
        const addedTags = this.tags.map(tag => tag.name)

        return this.autocomplete.filter(tag => addedTags.indexOf(tag.name) === -1)
    }

    get canCreate(): boolean {
        const name = this.nameAutocomplete

        if (name.trim() === '') {
            return false
        }

        if (name.trim().length < 3) {
            return false
        }

        return this.tags.map(tag => tag.name).indexOf(name.trim()) === -1
    }

    get nameAutocomplete(): string {
        return parseEmoji(this.name)[0]
    }

    mounted() {
        this.loadSuggestions()
    }

    @Watch('walletId')
    protected loadSuggestions() {
        if (this.walletId === undefined) {
            return
        }

        walletTagsGet(this.walletId).then(response => {
            this.suggestions = response.data.data
        }).catch(error => {
            console.error('Unable to load tags suggestions')
            console.debug(error)
        })
    }

    protected onAutocomplete() {
        const query = this.nameAutocomplete

        if (query.trim() === '' || this.walletId === undefined) {
            this.autocompleteActive = false
            return
        }

        this.autocompleteActive = true

        if (this.lastAutocompleteQuery === query) {
            return
        }

        this.lastAutocompleteQuery = query

        if (this.autocompleteDebounceHandle !== null) {
            window.clearTimeout(this.autocompleteDebounceHandle)
        }

        this.autocompleteLoading = true

        this.autocompleteDebounceHandle = window.setTimeout(() => {
            this.autocompleteDebounceHandle = null

            walletTagSearch(this.walletId, query)
                .then(this.onTagsAutocompleteLoaded)
                .catch(error => {
                    console.error('Unable to load tags autocomplete for query: ' + query)
                    console.debug(error)
                })
                .finally(() => {
                    this.autocompleteLoading = false
                })
        }, 500)
    }

    protected onTagsAutocompleteLoaded(response: AxiosResponse<TagsResponseInterface>) {
        this.autocomplete = response.data.data
    }

    protected onSelected(tag: TagInterface) {
        for (const addedTag of this.tags) {
            if (addedTag.name === tag.name) {
                return
            }
        }

        this.$emit('selected', tag)

        this.name = ''

        this.onAutocomplete()

        console.log(tag)
    }

    protected onInputActive() {
        this.suggestionActive = true
    }

    protected onInputInactive() {
        this.suggestionActive = false
    }

    @Watch('resetState')
    protected onReset() {
        this.name = ''
        this.autocomplete = []
        this.suggestionActive = false
        this.loadSuggestions()
    }
}
</script>

<style lang="scss" scoped>
.autocomplete-root {
    position: relative;

    .loader {
        color: #495057;
        position: absolute;
        top: 10px;
        right: 12px;
        font-size: 14px;
    }

    .autocomplete {
        position: absolute;
        z-index: 1;
        width: 100%;
        box-shadow: rgb(238 238 238) 0 4px 4px;
        margin-top: -3px;

        .list-container {
            margin-right: 5px;
        }

        .text-notice {
            font-size: 14px;
        }

        .list-group-item {
            padding: 10px 10px;
            border-top-width: 0;

            overflow: scroll;
            white-space: pre;
            vertical-align: top;
            position: relative;
            width: 100%;
            padding-right: 28px;
        }
    }
}
</style>
