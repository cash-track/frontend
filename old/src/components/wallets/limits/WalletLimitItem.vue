<template>
    <div class="wallet-limit" @click="onSelected" :class="{'active': selected}">
        <div class="justify-content-between align-items-end d-sm-flex block">
            <div>
                <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline type-icon" v-if="isIncome" />
                <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline type-icon" v-if="isExpense" />
                <tag v-for="tag of walletLimit.limit.tags" :key="tag.id" :tag="tag" />
            </div>
            <div>

                <div class="wallet-limit-total-container text-left text-sm-right">
                    <div class="wallet-limit-action">
                        <b-dropdown size="sm" no-caret right>
                            <template v-slot:button-content>
                                <b-icon-three-dots></b-icon-three-dots>
                            </template>
                            <b-dropdown-item @click="onEdit">{{ $t('limits.edit') }}</b-dropdown-item>
                            <b-dropdown-item @click="onDelete">{{ $t('limits.delete') }}</b-dropdown-item>
                        </b-dropdown>
                    </div>
                    <span class="wallet-limit-total" v-if="isIncome">
                        <span class="text-primary wallet-limit-total-value">
                            <b-icon-arrow-up variant="primary" scale="1" class="d-none d-sm-inline"></b-icon-arrow-up>
                            {{ walletLimit.amount | money(wallet.defaultCurrency) }}
                            <span class="limit-value">/ {{ walletLimit.limit.amount | money(wallet.defaultCurrency) }}</span>
                        </span>
                    </span>
                    <span class="wallet-limit-total" v-if="isExpense">
                        <span class="text-danger wallet-limit-total-value">
                            <b-icon-arrow-down variant="danger" scale="1" class="d-none d-sm-inline"></b-icon-arrow-down>
                            {{ walletLimit.amount | money(wallet.defaultCurrency) }}
                            <span class="limit-value">/ {{ walletLimit.limit.amount | money(wallet.defaultCurrency) }}</span>
                        </span>
                    </span>
                </div>
            </div>
        </div>

        <b-progress :max="100" show-progress variant="success">
            <b-progress-bar :value="walletLimit.percentage" :class="{'overused': isExpense && walletLimit.percentage > 100}">
                <span v-show="displayBarPercentage">
                    <strong>{{ walletLimit.percentage.toFixed() }} %</strong>
                </span>
            </b-progress-bar>
        </b-progress>

        <b-collapse v-if="walletLimit?.limit?.id" :id="getEditCollapseId()">
            <div class="wallet-limit-edit" v-if="isEdit">
                <limit-form :wallet="wallet" :edit="walletLimit.limit" @updated="onUpdated" @cancelled="onEditClosed"/>
            </div>
        </b-collapse>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import Tag from '@/components/tags/Tag.vue';
import { LimitsRepository, LimitsRepositoryInterface, WalletLimitInterface } from '@/api/limits';
import { WalletInterface } from '@/api/wallets';
import LimitForm, { LimitUpdatedEvent } from '@/components/wallets/limits/LimitForm.vue';

@Component({
    components: {LimitForm, Tag}
})
export default class WalletLimitItem extends Vue {
    @Prop()
    wallet!: WalletInterface

    @Prop()
    walletLimit!: WalletLimitInterface

    repository: LimitsRepositoryInterface = new LimitsRepository()

    selected: boolean = false
    isEdit: boolean = false

    get isIncome(): boolean {
        return this.walletLimit.limit.operation === '+'
    }

    get isExpense(): boolean {
        return this.walletLimit.limit.operation === '-'
    }

    get displayBarPercentage(): boolean {
        return this.walletLimit.percentage > 10
    }

    getEditCollapseId(): string {
        return `wallet-limit-edit-${this.walletLimit.limit.id}`
    }

    onSelected() {
        this.selected = !this.selected
    }

    onEdit() {
        this.isEdit = true;
        this.$root.$emit('bv::toggle::collapse', this.getEditCollapseId())
    }

    onEditClosed() {
        this.isEdit = false;
        this.$root.$emit('bv::toggle::collapse', this.getEditCollapseId())
    }

    onDelete() {
        if (! confirm(this.$t('limits.deletingConfirm').toString())) {
            return
        }

        this.repository.delete(this.wallet.id, this.walletLimit.limit.id).then(() => {
            this.$emit('deleted', {
                limit: this.walletLimit.limit,
            })
        }).catch(error => {
            console.log('unable to delete limit', error)
        })
    }

    onUpdated(event: LimitUpdatedEvent) {
        this.$emit('updated', event)
        this.onEditClosed()
    }
}
</script>

<style lang="scss">
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.type-icon {
    width: 20px;
    height: 20px;
    margin-right: 5px;
    vertical-align: middle;
}

.wallet-limit {
    padding: 7px 0 14px;
    position: relative;
    cursor: pointer;

    .badge-tag {
        margin-bottom: 5px;
    }

    .progress-bar {
        background-color: #a5acb2 !important;

        &.overused {
            background-color: #ec5454 !important;
        }
    }

    .wallet-limit-action {
        display: none;
        opacity: 0;
        margin-right: 15px;
        animation: fade-right-out 400ms cubic-bezier(0.68, -0.6, 0.32, 1.6) 0s 1 normal none;

        .dropdown > button {
            height: 20px;
            margin-top: -4px;
            padding-top: 0;
            padding-bottom: 0;

            & > svg {
                display: block;
            }
        }
    }

    .wallet-limit-total-container {
        padding-bottom: 5px;

        .wallet-limit-total {
            white-space: nowrap;
            font-size: 20px;
            line-height: 20px;

            .limit-value {
                font-size: 14px;
            }
        }
    }

    .wallet-limit-edit {
        padding: 15px;
        margin-top: 10px;
        background: #eee;
        border-top: 1px #ddd solid;
        border-bottom: 1px #ddd solid;
    }

    &:hover, &.active {
        .wallet-limit-action {
            display: inline-block;
            opacity: 1;
        }
    }

}

@keyframes fade-right-out {
    0% {
        opacity: 0;
        transform: translateX(15px);
    }

    100% {
        opacity: 1;
        transform: translateX(0);
    }
}

@include media-breakpoint-down(sm) {
    .wallet-limit-action {
        float: right;
    }
}

</style>
