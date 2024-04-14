<template>
    <b-form novalidate @submit.prevent="onSubmit">
        <b-card>
            <b-row v-show="preview.name || preview.icon">
                <b-col md="12">
                    <tag :tag="preview"
                         :state="previewState"
                         :error-message="getLoadingFailedMessageFor('deleting')"
                         @selected="onDelete"
                    ></tag>
                    <b-form-text>{{ $t('tags.editHelpLine1') }}</b-form-text>
                    <hr>
                </b-col>
            </b-row>
            <b-row>
                <b-col md="12">
                    <b-form-group
                        :invalid-feedback="validationMessage(['name', 'icon'])"
                        :state="validationState(['name', 'icon'])"
                    >
                        <b-input-group>
                            <b-form-input id="color" v-model="colorInput" type="color" size="10"></b-form-input>

                            <b-form-input
                                id="name"
                                v-model="input"
                                required
                                type="text"
                                :placeholder="$t('tags.inputLabel')"
                                :disabled="false"
                                autocomplete="off"
                                :state="validationState(['name', 'icon'])"
                                @change="resetValidationMessage(['name', 'icon'])"
                            ></b-form-input>

                            <b-input-group-append>
                                <b-button variant="primary" type="submit" :disabled="!isEmailConfirmed || isLoading">
                                    {{ isEdit ? $t('tags.update') : $t('tags.create') }}
                                    <b-spinner v-show="isLoading" small></b-spinner>
                                    <b-icon-check v-show="isSuccess"></b-icon-check>
                                </b-button>
                            </b-input-group-append>
                        </b-input-group>

                        <template v-slot:description>
                            {{ $t('tags.inputHelpLine1') }}<br><br>
                            {{ $t('tags.inputHelpLine2') }}<br><br>
                            {{ $t('tags.inputHelpLine3') }}
                        </template>
                    </b-form-group>

                    <warning-message :message="message" :show="hasMessage"></warning-message>
                </b-col>
            </b-row>

        </b-card>

    </b-form>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import Validator from '@/shared/Validator';
import { tagCreate, tagDelete, TagInterface, TagResponseInterface, tagUpdate } from '@/api/tags';
import Tag from '@/components/tags/Tag.vue';
import { AxiosResponse } from 'axios';
import { getEmojiFromString } from '@/shared/strings';

@Component({
    components: {Tag, WarningMessage}
})
export default class TagForm extends Mixins(Loader, Messager, Validator) {
    @Prop()
    tag!: TagInterface

    input = ''

    colorInput = ''

    isSuccess = false

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get isEdit(): boolean {
        return typeof this.tag !== "undefined" && this.tag !== null
    }

    get preview(): TagInterface {
        let name = this.input.trim()
        const potentialIcon = getEmojiFromString(name)
        let icon = null

        if (potentialIcon.length > 0) {
            icon = potentialIcon.trim()
            name = name.substr(potentialIcon.length).trim()
        }

        return {
            id: 0,
            name: name.trim(),
            icon: icon,
            color: this.colorInput.length !== 0 ? this.colorInput : null,
            userId: 0,
            createdAt: '',
            updatedAt: '',
        }
    }

    get previewState(): string|undefined {
        if (this.isEdit) {
            return 'closable';
        }

        if (this.isLoadingFor('deleting')) {
            return 'loading';
        }

        return undefined;
    }

    @Watch('tag')
    onTagChanged(tag: TagInterface|null) {
        if (tag === null) {
            this.input = ''
            return
        }

        if (tag?.icon === null) {
            this.input = tag?.name
        } else {
            this.input = `${tag?.icon} ${tag?.name}`
        }

        if (tag.color !== null) {
            this.colorInput = tag.color
        }
    }

    onSubmit() {
        this.resetMessage()
        this.resetValidationMessages()
        this.resetLoadingFailedMessage()

        this.setLoading();

        (!this.isEdit ? this.create() : this.update())
            .catch(this.dispatchError)
            .finally(this.setLoaded)
    }

    onDelete() {
        if (! this.isEdit) {
            return
        }

        if (! confirm(this.$t('tags.deletingConfirm', [this.tag.name]).toString())) {
            return
        }

        this.resetLoadingFailedMessageFor('deleting')
        this.setLoadingFor('deleting');

        tagDelete(this.tag.id).then(this.onDeleteSuccess).catch(error => {
            this.setLoadingFailedMessageFor('deleting', error?.response?.data?.message)
        }).finally(() => this.setLoadedFor('deleting'))
    }

    protected onDeleteSuccess() {
        this.$emit('deleted', this.tag)
        this.input = '';
    }

    protected create() {
        return tagCreate({
            name: this.preview.name,
            icon: this.preview.icon,
            color: this.preview.color,
        }).then(this.onCreateSuccess)
    }

    protected onCreateSuccess(response: AxiosResponse<TagResponseInterface>) {
        this.onSuccess()
        this.input = ''
        this.$emit('created', response.data.data)
    }

    protected update() {
        return tagUpdate(this.tag?.id, {
            name: this.preview.name,
            icon: this.preview.icon,
            color: this.preview.color,
        }).then(this.onUpdateSuccess)
    }

    protected onUpdateSuccess(response: AxiosResponse<TagResponseInterface>) {
        this.onSuccess()
        this.$emit('updated', response.data.data)
    }

    protected onSuccess() {
        this.isSuccess = true

        setTimeout(() => {
            this.isSuccess = false
        }, 2000)
    }
}
</script>

<style lang="scss" scoped>
input[type=color] {
    max-width: 40px;
    min-width: 40px;
}

</style>
