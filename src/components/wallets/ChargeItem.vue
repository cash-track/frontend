<template>
    <b-row class="charge-item" :class="{'active': isActive}">
        <b-col md="4" cols="12" class="charge-date-container">
            <b-row>
                <b-col lg="9" md="8" order="2" order-md="1" class="charge-meta text-md-right" :class="{'has-tags': charge.tags.length > 0}">
                    <span class="text-muted charge-date"
                          :title="dateTime"
                          v-b-tooltip.left>
                        {{ charge.createdAt | moment("HH:mm") }}
                    </span>
                    <div class="charge-tags">
                        <tag v-for="tag of charge.tags" :key="tag.id" :tag="tag" @selected="onTagSelected"></tag>
                    </div>
                </b-col>
                <b-col lg="3" md="4" order="1" order-md="2" class="charge-avatar-container">
                    <profile-avatar class="charge-avatar" :user="charge.user"></profile-avatar>
                </b-col>
            </b-row>
        </b-col>
        <b-col md="8" cols="12" class="charge-main-container">
            <div class="charge-type" v-show="!isEdit">
                <b-icon-arrow-up variant="success" v-if="charge.operation === '+'"></b-icon-arrow-up>
                <b-icon-arrow-down variant="danger" v-if="charge.operation === '-'"></b-icon-arrow-down>
            </div>

            <div class="charge-pointer"></div>

            <div class="charge-action float-right" v-if="!readOnly && !isEdit">
                <b-dropdown size="sm" no-caret right>
                    <template v-slot:button-content>
                        <b-icon-three-dots></b-icon-three-dots>
                    </template>
                    <b-dropdown-item @click="toggleEdit" :disabled="!isEmailConfirmed">{{ $t('charges.edit') }}</b-dropdown-item>
                    <b-dropdown-item @click="onDeleted" :disabled="!isEmailConfirmed">{{ $t('charges.delete') }}</b-dropdown-item>
                </b-dropdown>
            </div>

            <div class="charge-header" v-if="!isEdit" @click="toggleActive">
                <span class="charge-amount">{{ charge.amount | money(currency) }}</span>
                <span class="charge-title">{{ charge.title.trim() }}
                    <span
                        class="charge-wallet text-muted"
                        v-if="showWallet && charge.wallet !== null"
                    >@{{ charge.wallet.name }}
                        <b-badge variant="primary" v-if="charge.wallet.isActive">{{ $t('wallets.active') }}</b-badge>
                        <b-badge variant="secondary" v-if="charge.wallet.isArchived">{{ $t('wallets.archived') }}</b-badge>
                    </span>
                </span>
            </div>

            <div class="charge-body" v-if="!isEdit" v-show="isActive && charge.description">
                <span>{{ charge.description }}</span>
            </div>

            <div class="charge-edit" v-if="!readOnly && isEdit">
                <charge-edit
                    :wallet="wallet ? wallet : charge.wallet"
                    :charge="charge"
                    @updated="onUpdated"
                    @cancelled="toggleEdit"
                ></charge-edit>
            </div>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import {
    ChargeInterface,
    ChargesRepository,
    ChargesRepositoryInterface
} from '@/api/charges';
import { WalletInterface } from '@/api/wallets';
import ProfileAvatar from '../profile/ProfileAvatar.vue';
import ChargeEdit, { ChargeUpdatedEvent } from '@/components/wallets/ChargeEdit.vue';
import Tag from '@/components/tags/Tag.vue';
import { TagInterface } from '@/api/tags';
import { CurrencyInterface } from '@/api/currency';

export interface ChargeSelectedEvent {
    id: string;
    charge: ChargeInterface;
}

export interface ChargeUnSelectedEvent {
    id: string;
    charge: ChargeInterface;
}

export interface ChargeDeletedEvent {
    id: string;
    charge: ChargeInterface;
}

@Component({
    components: {ChargeEdit, ProfileAvatar, Tag}
})
export default class ChargeItem extends Vue {
    @Prop()
    wallet!: WalletInterface

    @Prop({
        required: true
    })
    charge!: ChargeInterface

    @Prop({
        default: false,
        type: Boolean,
    })
    readOnly!: boolean

    @Prop({
        default: false,
        type: Boolean,
    })
    showWallet!: boolean

    repository: ChargesRepositoryInterface = new ChargesRepository()

    isActive = false
    isEdit = false

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get dateTime(): string {
        return this.$moment(this.charge.createdAt).format('Y-MM-DD HH:mm:ss')
    }

    get currency(): CurrencyInterface {
        if (this.wallet !== undefined && this.wallet !== null) {
            return this.wallet.defaultCurrency
        }

        if (this.charge.wallet !== null) {
            return this.charge.wallet.defaultCurrency
        }

        return this.$store.state.profile.defaultCurrency
    }

    toggleActive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.isActive = !this.isActive

        const notification = {
            id: this.charge.id,
            charge: this.charge,
        }

        if (this.isActive) {
            this.$emit('selected', notification)
        } else {
            this.$emit('un-selected', notification)
        }
    }

    toggleEdit() {
        this.isEdit = !this.isEdit
        this.isActive = this.isEdit
    }

    onUpdated(event: ChargeUpdatedEvent) {
        this.toggleEdit()

        this.$emit('updated', event)
    }

    onDeleted(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        if (! confirm(this.$t('charges.deletingConfirm').toString())) {
            return
        }

        this.repository.delete(this.wallet.id, this.charge.id).then(() => {
            this.toggleEdit()
            this.$emit('deleted', {
                id: this.charge.id,
                charge: this.charge,
            })
        }).catch(error => {
            console.log('unable to delete charge', error)
        })
    }

    protected onTagSelected(tag: TagInterface) {
        this.$emit('tag-selected', tag)
    }
}
</script>

<style lang="scss">
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.charge-item {
    .charge-date-container {
        position: relative;

        .charge-meta {
            margin-top: 15px;

            &.has-tags {
                margin-top: 4px;
            }

            .charge-date {
                font-size: 14px;
            }

            .charge-tags {
                overflow: hidden;
                white-space: pre;
                vertical-align: top;
                text-align: right;
                position: relative;
                width: calc(100% + 28px);
                padding-right: 28px;
                margin-top: 5px;
            }

            .charge-tags:before {
                content: "";
                width: 28px;
                height: 100%;
                position: absolute;
                right: 0;
                top: 0;
                background: linear-gradient(to right, transparent 0px, #ffffff);
            }
        }

        .charge-avatar {
            margin: 10px 5px;
        }
    }

    .charge-main-container {
        border-left: 1px solid #eee;
        padding: 18px 45px 30px;
        position: relative;

        .charge-type {
            position: absolute;
            left: -12px;
            top: 18px;
            background: #fff;
            padding: 2px;
            height: 24px;
            width: 24px;
            text-align: center;
            font-size: 20px;
            line-height: 20px;
            border-radius: 40px;
            overflow: visible;
            display: inline;
        }

        .charge-pointer {
            display: block;
            position: absolute;
            top: 30px;
            left: 12px;
            width: 30px;
            height: 0;
            border-top: 1px solid #eee;
        }

        .charge-wallet {
            font-size: 14px;
        }

        .charge-action {
            .btn {
                height: 14px;
                display: inline-block;
                padding: 0 .5rem;
                font-size: 14px;
                line-height: 13px;
            }

            &>:not(.open) {
                //display: none;
            }
        }

        .charge-header {
            cursor: pointer;

            .charge-amount {
                font-weight: 700;
                display: inline-block;
                min-width: 110px;
                padding: 0 10px 0 0;
            }

            .charge-title {
                overflow: hidden;
                white-space: pre;
                text-overflow: ellipsis;
                max-width: calc(100% - 200px);
                display: inline-block;
                vertical-align: top;
            }
        }

        .charge-body {
            padding-top: 10px;

            &>span {
                white-space: pre-wrap;
            }
        }

        &:hover .charge-type {
            cursor: pointer;
            background-color: #eee!important;
        }
    }

    &.active {
        background: #f5f5f5;
        border-bottom: 1px solid #eee;

        .charge-main-container .charge-header .charge-title {
            overflow: visible;
            white-space: normal;
            text-overflow: initial;
        }

        .charge-date-container .charge-meta .charge-tags {
            overflow: inherit;
            white-space: normal;
            text-overflow: inherit;

            width: 100%;
            padding-right: 0;

            &:before {
                display: none;
            }
        }
    }

    &:hover {
        .charge-action {
            //display: block;
        }
    }
}

@include media-breakpoint-down(sm) {
    .charge-item {
        .charge-date-container {
            &>:nth-child(1) {
                padding: 10px 6px;
            }

            .charge-avatar-container {
                display: inline;
                width: auto;
                padding: 0 2px;
            }

            .charge-meta {
                display: inline;
                width: auto;
                margin-top: 18px;
                padding-left: 4px;

                max-width: 85%;
                padding-right: 0;

                .charge-tags {
                    text-align: left;
                    max-width: 100%;
                    width: auto;
                }
            }
        }

        .charge-date-container + .charge-main-container {
            padding-top: 6px
        }

        .charge-main-container {
            border-left: 0;
            padding: 18px 20px 20px;

            .charge-header {
                display: inline;

                .charge-title {
                    display: block;
                    max-width: none;
                    padding: 0 0 0 45px;
                }

                .charge-amount {
                    min-width: initial;
                }
            }

            .charge-pointer {
                display: none;
            }

            .charge-type {
                position: initial;
                vertical-align: middle;
                margin-right: 16px;
                padding: 2px 4px;
            }

            .charge-body {
                padding-left: 45px;
            }
        }

        &.active {
            .charge-main-container .charge-title {
                white-space: normal;
            }
        }
    }
}
</style>
