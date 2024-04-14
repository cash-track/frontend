<template>
    <b-form-group
        label-sr-only
        label-cols-lg="4"
        class="passkey-item"
    >
        <div class="passkey-item-title-container">
            <div class="d-flex justify-content-between">
                <span class="passkey-title" v-b-toggle="`passkey-details-${passkey.id}`">
                    <b-icon-chevron-down :class="{'active':detailsVisible}"/>
                    {{ passkey.name }}
                </span>
                <b-button
                    variant="danger"
                    size="sm"
                    @click="onDelete"
                    :disabled="isLoading"
                >
                    {{ $t('passkeySettings.delete') }}
                    <b-spinner v-show="isLoading" small></b-spinner>
                    <b-icon v-show="hasMessage"
                            icon="exclamation-triangle"
                            v-b-popover.hover.left="{
                                title: $t('error'),
                                content: getMessage(),
                                html: true
                            }"
                    />
                </b-button>
            </div>
            <b-collapse
                :id="`passkey-details-${passkey.id}`"
                v-model="detailsVisible"
            >
                <span class="passkey-created-date text-secondary">
                    <b-icon-calendar></b-icon-calendar>
                    {{ $t('passkeySettings.created') }}: {{ passkey.createdAt | moment('Y-MM-DD HH:mm') }}
                </span>
                <br>
                <span class="passkey-created-date text-secondary">
                    <b-icon-calendar></b-icon-calendar>
                    {{ $t('passkeySettings.used') }}: {{ usedAt }}
                </span>
            </b-collapse>
        </div>
    </b-form-group>
</template>

<script lang="ts">
import { Mixins, Component, Prop } from 'vue-property-decorator'
import Loader from '@/shared/Loader';
import Messager from '@/shared/Messager';
import Validator from '@/shared/Validator';
import { passkeyDelete, PasskeyInterface } from '@/api/profile/passkeys';

@Component({})
export default class PasskeyItem extends Mixins(Loader, Messager, Validator) {
    @Prop()
    passkey!: PasskeyInterface

    detailsVisible = false

    get usedAt(): string {
        if (this.passkey.usedAt) {
            return this.$moment(this.passkey.usedAt).format('Y-MM-DD HH:mm')
        }

        return this.$t('passkeySettings.usedAtNever').toString();
    }

    public async onDelete() {
        this.resetMessage()

        const msg = this.$t('passkeySettings.deleteConfirm')
            .toString()
            .replaceAll('{name}', this.passkey.name)

        if (!confirm(msg)) {
            return
        }

        this.setLoading()

        try {
            await passkeyDelete(this.passkey.id)
            this.onDeleted()
        } catch (exception) {
            this.dispatchException(exception)
        }

        this.setLoaded()
    }

    protected onDeleted() {
        this.$emit('deleted', {
            passkey: this.passkey,
        })
    }
}
</script>

<style lang="scss" scoped>
.passkey-item {
    margin-bottom: 0;

    .passkey-created-date {
        font-size: 14px;
    }

    .passkey-title .b-icon {
        transition: transform 0.5s;

        &.active {
            transform: rotateX(180deg);
        }
    }

    .passkey-item-title-container {
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        padding: 0.5rem 0;

        .passkey-title {
            display: block;
            width: 100%;
        }

        button {
            white-space: nowrap;
        }
    }

    &:last-child {
        .passkey-item-title-container {
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
    }
}
</style>
