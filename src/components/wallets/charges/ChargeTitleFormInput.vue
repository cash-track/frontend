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
            <b-list-group-item>
                <b-list-group class="items-container">
                    <b-list-group-item :key="item.title"
                                       button
                                       v-for="item of chargeTitleAutocompleteFiltered"
                                       @click="onTitleSelected(item)"
                                       class="d-flex justify-content-between align-items-center"
                    >
                        {{ item.title }}
                        <b-badge>{{ item.count }}</b-badge>
                    </b-list-group-item>
                </b-list-group>
            </b-list-group-item>
        </b-list-group>
    </b-form-group>
</template>

<script lang="ts">
import { AxiosResponse } from 'axios';
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { tagGetSuggestions, TagInterface, TagsResponseInterface } from '@/api/tags';
import Tag from '@/components/tags/Tag.vue';
import { chargeTitleGetSuggestions, ChargeTitleInterface, ChargeTitlesResponseInterface } from '@/api/charges';

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
    chargeTitleAutocomplete: Array<ChargeTitleInterface> = []
    autocompleteActive = false
    autocompleteLoading = false
    autocompleteDebounceHandle: number|null = null
    lastAutocompleteQuery = ''

    get autocompleteFiltered(): Array<TagInterface> {
        const addedTags = this.tags.map(tag => tag.name)

        return this.autocomplete.filter(tag => addedTags.indexOf(tag.name) === -1)
    }

    get chargeTitleAutocompleteFiltered(): Array<ChargeTitleInterface> {
        const title = this.name.trim().toLowerCase()
        return this.chargeTitleAutocomplete.filter(item => item.title.toLowerCase() !== title)
    }

    get hasAutocompleteData(): boolean {
        return this.autocompleteFiltered.length > 0 || this.chargeTitleAutocompleteFiltered.length > 0
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

            Promise.all([
                tagGetSuggestions(query),
                chargeTitleGetSuggestions(query)
            ])
                .then(this.onAutocompleteLoaded)
                .catch(error => {
                    console.error('Unable to load charge title autocomplete for query: ' + query)
                    console.debug(error)
                })
                .finally(() => {
                    this.autocompleteLoading = false
                })
        }, 500)
    }

    protected onAutocompleteLoaded(responses: Array<AxiosResponse>) {
        this.onTagsAutocompleteLoaded(responses[0])
        this.onChargeTitlesAutocompleteLoaded(responses[1])
        this.autocompleteActive = this.hasAutocompleteData
    }

    protected onTagsAutocompleteLoaded(response: AxiosResponse<TagsResponseInterface>) {
        this.autocomplete = response.data.data
    }

    protected onChargeTitlesAutocompleteLoaded(response: AxiosResponse<ChargeTitlesResponseInterface>) {
        this.chargeTitleAutocomplete = response.data.data
    }

    protected onSelected(tag: TagInterface) {
        for (const addedTag of this.tags) {
            if (addedTag.name === tag.name) {
                return
            }
        }

        this.$emit('selected', tag)

        this.onAutocomplete()

        this.autocompleteActive = this.hasAutocompleteData

        console.log(tag)
    }

    protected onTitleSelected(title: ChargeTitleInterface) {
        this.name = title.title

        this.onInputChanged()

        this.onAutocomplete()

        this.autocompleteActive = this.hasAutocompleteData

        console.log(title)
    }

    protected onInputActive() {
        this.autocompleteActive = this.hasAutocompleteData
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
        this.chargeTitleAutocomplete = []
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
        border-top-right-radius: 0;
        border-top-left-radius: 0;

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

            &+.list-group-item {
                padding: 0;
                max-height: 155px;
                overflow-y: scroll;
            }
        }

        .items-container {
            .list-group-item {
                padding: 6px 10px;
                font-size: 14px;
                border-left-width: 0;
                border-right-width: 0;
                overflow: visible;

                &:last-child {
                    border-bottom-width: 0;
                }
            }
        }
    }
}
</style>
