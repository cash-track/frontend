<template>
    <b-row class="charge-item" :class="{'active': isActive}">
        <b-col sm="4" class="text-right charge-date-container">
            <span class="text-muted charge-date"
                  :title="dateTime"
                  v-b-tooltip.left>
                {{ charge.createdAt | moment("from") }}
            </span>
            <profile-avatar class="charge-avatar" :user="charge.user"></profile-avatar>
        </b-col>
        <b-col sm="8" class="charge-main-container">
            <b-icon-arrow-up class="charge-type" variant="success" scale="2" v-if="charge.operation === '+'"></b-icon-arrow-up>
            <b-icon-arrow-down class="charge-type" variant="danger" scale="2" v-if="charge.operation === '-'"></b-icon-arrow-down>
            <div class="charge-pointer"></div>

            <div class="charge-action float-right" v-if="!isEdit">
                <b-dropdown size="sm" no-caret right>
                    <template v-slot:button-content>
                        <b-icon-three-dots></b-icon-three-dots>
                    </template>
                    <b-dropdown-item @click="toggleEdit">Edit</b-dropdown-item>
                    <b-dropdown-item @click="onDeleted">Delete</b-dropdown-item>
                </b-dropdown>
            </div>

            <div class="charge-header" v-if="!isEdit" @click="toggleActive">
                <span class="charge-amount">{{ charge.amount | money(wallet.defaultCurrency) }}</span>
                <span class="charge-title">{{ charge.title }}</span>
            </div>
            <div class="charge-body" v-if="!isEdit" v-show="isActive && charge.description">
                <span>{{ charge.description }}</span>
            </div>
            <div class="charge-edit" v-if="isEdit">
                <charge-edit
                    :wallet="wallet"
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
import { walletChargeDelete, ChargeInterface } from '@/api/charges';
import { WalletInterface } from '@/api/wallets';
import ProfileAvatar from '../profile/ProfileAvatar.vue';
import ChargeEdit, { ChargeUpdatedEvent } from '@/components/wallets/ChargeEdit.vue';

export interface ChargeDeletedEvent {
    id: string;
    charge: ChargeInterface;
}

@Component({
    components: {ChargeEdit, ProfileAvatar}
})
export default class ChargeItem extends Vue {
    @Prop({
        required: true
    })
    wallet!: WalletInterface

    @Prop({
        required: true
    })
    charge!: ChargeInterface

    isActive = false
    isEdit = false

    get dateTime(): string {
        return this.$moment(this.charge.createdAt).format('Y-MM-DD HH:mm:ss')
    }

    toggleActive(event: Event) {
        event.preventDefault()
        event.stopPropagation()

        this.isActive = !this.isActive
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

        walletChargeDelete(this.wallet.id, this.charge.id).then(() => {
            this.toggleEdit()
            this.$emit('deleted', {
                id: this.charge.id,
                charge: this.charge,
            })
        }).catch(error => {
            console.log('unable to delete charge', error)
        })
    }
}
</script>

<style lang="scss">
.charge-item {
    .charge-date-container {
        padding-top: 10px;
        position: relative;

        .charge-date {
            font-size: 14px;
        }

        .charge-avatar {
            margin: 0 6px 0 35px;
        }
    }

    .charge-main-container {
        border-left: 1px solid #eee;
        padding: 18px 45px 20px;
        position: relative;

        .charge-type {
            position: absolute;
            left: -12px;
            top: 18px;
            background: #fff;
            padding: 6px;
            height: 24px;
            width: 24px;
            text-align: center;
            font-size: 20px;
            line-height: 20px;
            border-radius: 40px;
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
                white-space: pre;
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
    }

    &:hover {
        .charge-action {
            //display: block;
        }
    }
}
</style>