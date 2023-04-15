<template>
    <b-form-group label-for="title-suggestion"
                  class="autocomplete-root"
                  :invalid-feedback="validationMessage"
                  :state="validationState"
                  v-click-outside="onInputInactive"
    >
        <b-spinner small class="loader" v-if="autocompleteLoading"></b-spinner>
        <b-input
            type="text"
            id="title-suggestion"
            required
            :placeholder="$t('charges.title')"
            v-model="name"
            :disabled="disabled"
            :state="validationState"
            @keyup="onAutocomplete"
            @focusin="onInputActive"
            @change="onInputChanged"
            autocomplete="off"
        ></b-input>
        <b-list-group class="autocomplete" v-show="autocompleteActive">
            <b-list-group-item>
                <span v-if="autocompleteFiltered.length" class="list-container">
                    <tag v-for="tag of autocompleteFiltered"
                         :tag="tag"
                         :key="tag.id"
                         @selected="onSelected"
                    ></tag>
                </span>
                <span v-else-if="!autocompleteFiltered.length"
                      class="text-notice text-muted"
                >{{ $t('tags.autocompleteHint') }}</span>
            </b-list-group-item>
        </b-list-group>
    </b-form-group>
</template>

<script lang="ts">
import { AxiosResponse } from 'axios';
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { tagGetSuggestions, TagInterface, TagsResponseInterface } from '@/api/tags';
import Tag from '@/components/tags/Tag.vue';

@Component({
    components: {Tag}
})
export default class ChargeTitleFormInput extends Vue {
    @Prop({
        required: true,
        type: Array,
        default: [],
    })
    tags!: Array<TagInterface>

    @Prop({
        required: true,
        type: String,
    })
    value!: string

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

    autocomplete: Array<TagInterface> = []
    autocompleteActive = false
    autocompleteLoading = false
    autocompleteDebounceHandle: number|null = null
    lastAutocompleteQuery = ''

    get autocompleteFiltered(): Array<TagInterface> {
        const addedTags = this.tags.map(tag => tag.name)

        return this.autocomplete.filter(tag => addedTags.indexOf(tag.name) === -1)
    }

    @Watch('value')
    protected updateName() {
        if (this.value === undefined) {
            return
        }
        this.name = this.value
    }

    protected onAutocomplete() {
        const query = this.name

        if (query.trim() === '') {
            this.autocompleteActive = false
            return
        }

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

            tagGetSuggestions(query)
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
        this.autocompleteActive = this.autocompleteFiltered.length > 0
    }

    protected onSelected(tag: TagInterface) {
        for (const addedTag of this.tags) {
            if (addedTag.name === tag.name) {
                return
            }
        }

        this.$emit('selected', tag)

        this.onAutocomplete()

        this.autocompleteActive = this.autocompleteFiltered.length > 0

        console.log(tag)
    }

    protected onInputActive() {
        this.autocompleteActive = this.autocompleteFiltered.length > 0
    }

    protected onInputInactive() {
        this.autocompleteActive = false
    }

    protected onInputChanged() {
        this.$emit('input', this.name)
    }

    @Watch('resetState')
    protected onReset() {
        this.autocomplete = []
        this.autocompleteActive = false
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
