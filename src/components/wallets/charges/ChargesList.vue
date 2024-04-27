<template>
    <div class="charges-list-container">
        <div class="charge-loader-main" v-show="isLoading">
            <div class="d-flex justify-content-center">
                <b-spinner variant="light"></b-spinner>
                <span class="loading-text ml-2">{{ $t('charges.loading') }}</span>
            </div>
        </div>

        <warning-message message="Unable to load charges. Please try again later" :show="isLoadingFailed" class="mt-3"></warning-message>

        <b-row class="charge-item" v-if="hasWallet && !isLoadingFailed && isWalletActive">
            <b-col offset-md="4" md="8" class="charge-main-container wallet-charge-create">
                <div class="charge-type">
                    <b-icon-plus variant="muted" scale="1.5"></b-icon-plus>
                </div>

                <b-button variant="outline-primary" class="my-2 mr-2" v-b-toggle.charge-create :disabled="!isEmailConfirmed">{{ $t('charges.new') }}</b-button>

                <b-dropdown variant="outline-primary" class="my-2 mr-2" v-show="selectedCharges.length">
                    <template #button-content>
                        {{ $t('charges.move') }}
                        <b-spinner small v-show="isLoadingFor('move') || isMoveTargetWalletsLoading"></b-spinner>
                    </template>
                    <b-dropdown-item-button
                        :key="wallet.id"
                        v-for="wallet of moveTargetWallets"
                        @click="onMoveTo(wallet)"
                        :disabled="isLoadingFor('move') || isMoveTargetWalletsLoading"
                    >
                        {{ wallet.name }} <b-badge variant="success">{{ wallet.totalAmount | money(wallet.defaultCurrency) }}</b-badge>
                    </b-dropdown-item-button>
                </b-dropdown>

                <b-icon-exclamation-triangle-fill
                    class="warning-icon my-3 mr-2 align-top"
                    v-if="moveErrorMessage.content"
                    variant="warning"
                    v-b-popover="moveErrorMessage"
                    @click="onMoveToErrorClear"
                ></b-icon-exclamation-triangle-fill>

                <b-collapse class="charge-create" id="charge-create">
                    <charge-create :wallet="wallet" @created="onChargeCreated"></charge-create>
                </b-collapse>
            </b-col>
        </b-row>

        <div class="charges-list" v-if="!isLoadingFailed">
            <div :key="key" v-for="[key, value] in chargesGrouped" class="charges-list-group">
                <b-row v-show="key" class="charges-list-group-title">
                    <b-col md="4" cols="12" class="charges-list-group-title-container">
                        <hr>
                        <span class="text-muted">{{ key }}</span>
                    </b-col>
                    <b-col md="8" cols="12" class="charges-list-group-title-placeholder">
                        <hr>
                    </b-col>
                </b-row>

                <charge-item
                    v-for="charge of value"
                    v-bind:key="charge.id"
                    :wallet="wallet"
                    :charge="charge"
                    :read-only="!hasWallet && charge.wallet === null"
                    :show-wallet="!hasWallet"
                    @updated="onChargeUpdated"
                    @deleted="onChargeDeleted"
                    @tag-selected="onTagSelected"
                    @selected="onChargeSelected"
                    @un-selected="onChargeUnSelected"
                ></charge-item>
            </div>

            <div class="charge-loader-pagination" v-if="isLoadingPagination">
                <div class="d-flex justify-content-center">
                    <b-spinner small></b-spinner>
                    <span class="loading-text ml-2">{{ $t('charges.loadingMore') }}</span>
                </div>
            </div>

            <vue-visibility-trigger @scrolledIn="onLoadMoreCharges"></vue-visibility-trigger>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { AxiosResponse } from 'axios';
import Loader from '@/shared/Loader';
import { WalletInterface } from '@/api/wallets';
import {
    ChargeInterface,
    ChargesResponseInterface,
    tagChargesGet,
    tagChargesGetPaginated,
    walletChargesGet,
    walletChargesGetPaginated,
    walletChargesMove,
} from '@/api/charges';
import { emptyPagination, PaginationInterface } from '@/api/pagination';
import WarningMessage from '@/components/shared/WarningMessage.vue';
import { ChargeUpdatedEvent } from '@/components/wallets/ChargeEdit.vue';
import ChargeItem, {
    ChargeDeletedEvent,
    ChargeSelectedEvent,
    ChargeUnSelectedEvent
} from '@/components/wallets/ChargeItem.vue';
import ChargeCreate, { ChargeCreatedEvent } from '@/components/wallets/ChargeCreate.vue';
import { TagInterface } from '@/api/tags';
import { Filter, FilterDataInterface } from '@/api/filters';
import { Moment } from 'moment/moment';

const PAGINATION = 'pagination'
const GROUP_DATE_FORMAT = 'dddd, D MMMM YYYY'

export interface ChargesMovedEvent {
    sourceWallet: WalletInterface;
    targetWallet: WalletInterface;
    charges: Array<ChargeInterface>;
}

@Component({
    components: {ChargeCreate, WarningMessage, ChargeItem}
})
export default class ChargesList extends Mixins(Loader) {
    @Prop()
    wallet!: WalletInterface

    @Prop()
    tag!: TagInterface

    @Prop()
    filter!: FilterDataInterface

    selectedCharges: Array<ChargeInterface> = []

    moveErrorMessage = {
        id: `wallet-charges-move-message-${this.wallet?.id}`,
        variant: 'warning',
        placement: 'right',
        trigger: 'hover focus',
        content: ''
    }

    charges: Array<ChargeInterface> = []

    pagination: PaginationInterface = emptyPagination()

    today: Moment = this.$moment().startOf('day')

    get isEmailConfirmed(): boolean {
        return this.$store.state.isEmailConfirmed
    }

    get moveTargetWallets(): Array<WalletInterface> {
        return this.$store.state.activeWallets.filter((wallet: WalletInterface) => wallet.id !== this.wallet.id)
    }

    get isMoveTargetWalletsLoading(): boolean {
        return !this.$store.state.activeWalletsLoadingStatus
    }

    get isLoadingPagination(): boolean {
        return this.isLoadingFor(PAGINATION)
    }

    get hasWallet(): boolean {
        return this.wallet !== undefined
    }

    get isWalletActive(): boolean {
        return this.hasWallet && this.wallet?.isActive
    }

    get chargesGrouped(): Map<string, Array<ChargeInterface>> {
        const map = new Map<string, Array<ChargeInterface>>()

        for (const charge of this.charges) {
            const group = this.getGroupName(charge.createdAt)

            let list = map.get(group)

            if (list === undefined) {
                list = new Array<ChargeInterface>()
            }

            list.push(charge)

            map.set(group, list)
        }

        return map
    }

    private getGroupName(dateTime: string): string {
        const date = this.$moment(dateTime).startOf('day')

        const diff = this.today.diff(date, 'days')

        if (diff === 0) {
            return ''
        }

        return date.format(GROUP_DATE_FORMAT)
    }

    mounted() {
        this.initiallyLoadCharges()
    }

    private buildLoader(page: number|null): Promise<AxiosResponse<ChargesResponseInterface>>|null {
        if (this.wallet !== undefined) {
            return page === null ?
                walletChargesGet(this.wallet.id, Filter.createFromData(this.filter)) :
                walletChargesGetPaginated(this.wallet.id, page, Filter.createFromData(this.filter))
        }

        if (this.tag !== undefined) {
            return page === null ?
                tagChargesGet(this.tag.id, Filter.createFromData(this.filter)) :
                tagChargesGetPaginated(this.tag.id, page, Filter.createFromData(this.filter))
        }

        return null;
    }

    @Watch('wallet.id')
    @Watch('tag')
    @Watch('filter', {
        deep: true
    })
    protected initiallyLoadCharges() {
        this.setLoading()
        this.resetLoadingFailedMessage();

        this.buildLoader(null)?.then(response => {
            this.charges = []
            this.onChargesLoaded(response)
        }).catch(() => {
            this.charges = []
            this.setLoadingFailedMessage(this.$t('charges.loadingError').toString())
        }).finally(this.setLoaded)
    }

    protected onChargesLoaded(response: AxiosResponse<ChargesResponseInterface>) {
        this.charges.push(...response.data.data)
        this.pagination = response.data.pagination
    }

    public onLoadMoreCharges(event: boolean) {
        if (typeof this.pagination === 'undefined') {
            return
        }

        if (!event || this.isLoadingFor(PAGINATION) || this.pagination.nextPage === null) {
            return
        }

        this.resetLoadingFailedMessageFor(PAGINATION)
        this.setLoadingFor(PAGINATION);

        this.buildLoader(this.pagination.nextPage)
            ?.then(this.onChargesLoaded)
            .catch(() => {
                this.setLoadingFailedMessageFor(PAGINATION, this.$t('charges.loadingMoreError').toString())
            }).finally(() => {
                this.setLoadedFor(PAGINATION)
            })
    }

    // forward event
    public onChargeCreated(event: ChargeCreatedEvent) {
        const charges = Array.from<ChargeInterface>(this.charges)
        const index = charges.findIndex(charge => charge.dateTime < event.charge.dateTime)

        if (index === -1) {
            this.charges.unshift(event.charge)
        } else {
            this.charges.splice(index, 0, event.charge)
        }

        this.$root.$emit('bv::toggle::collapse', 'charge-create')
        this.$emit('created', event)
    }

    // forward event
    public onChargeUpdated(event: ChargeUpdatedEvent) {
        const charges = Array.from<ChargeInterface>(this.charges)
        const index = charges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            console.warn('Unable to find charge in the list. Charge ID:', event.id)
            return
        }

        charges[index] = event.charge

        this.charges = charges

        if (this.tag !== undefined &&
            this.charges.length === 1 &&
            event.charge.tags.map(tag => tag.id).indexOf(this.tag.id) === -1
        ) {
            this.$emit('last-charge-removed', event)
            return
        }

        this.$emit('updated', event)
    }

    // forward event
    public onChargeDeleted(event: ChargeDeletedEvent) {
        const index = this.charges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            console.warn('Unable to find charge in the list. Charge ID:', event.id)
            return
        }

        this.charges.splice(index, 1)

        this.$emit('deleted', event)
    }

    public onTagSelected(tag: TagInterface) {
        this.$emit('tag-selected', tag)
    }

    public onChargeSelected(event: ChargeSelectedEvent) {
        this.selectedCharges.push(event.charge)
    }
    public onChargeUnSelected(event: ChargeUnSelectedEvent) {
        const index = this.selectedCharges.findIndex(charge => charge.id === event.id)

        if (index === -1) {
            return
        }

        this.selectedCharges.splice(index, 1)
    }

    public onMoveTo(targetWallet: WalletInterface) {
        if (this.selectedCharges.length === 0) {
            return
        }

        this.onMoveToErrorClear()
        this.setLoadingFor('move')

        walletChargesMove(this.wallet.id, targetWallet.id, this.selectedCharges.map(charge => charge.id))
            .then(() => {
                this.onMovedTo({
                    sourceWallet: this.wallet,
                    targetWallet: targetWallet,
                    charges: this.selectedCharges,
                })
            })
            .catch(() => {
                this.onMoveToError()
            }).finally(() => {
                this.setLoadedFor('move')
            })
    }

    public onMoveToError() {
        this.moveErrorMessage.content = this.$t('charges.moveError').toString()
        this.$root.$emit('bv::show::popover', this.moveErrorMessage.id)

    }

    public onMoveToErrorClear() {
        this.moveErrorMessage.content = ''
        this.$root.$emit('bv::hide::popover', this.moveErrorMessage.id)
    }

    public onMovedTo(event: ChargesMovedEvent) {
        for (const movedCharge of event.charges) {
            const index = this.charges.findIndex(charge => charge.id === movedCharge.id)

            if (index === -1) {
                console.warn('Unable to find charge in the list. Charge ID:', movedCharge.id)
                return
            }

            this.charges.splice(index, 1)
        }

        this.selectedCharges = []

        this.$emit('moved', event)
    }
}
</script>

<style lang="scss" scoped>
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.charges-list-container {
    position: relative;

    .charges-list-group {
        .charges-list-group-title {
            font-size: 14px;

            &>div {
                padding-top: 20px;
                padding-bottom: 20px;
                padding-left: 0;
                padding-right: 0;
            }

            .charges-list-group-title-container {
                position: relative;

                span {
                    background: #fff;
                    padding: 3px 5px;
                    display: inline-block;
                    margin-left: 26px;
                    position: absolute;
                    top: 30%;
                }
            }

            .charges-list-group-title-placeholder {
                border-left: 1px solid #eee;
            }
        }
    }

    .charge-loader-main {
        padding: 30px 0;
        height: 100%;
        position: absolute;
        width: 100%;
        background: rgb(255 255 255 / 77%);
        z-index: 100;
        cursor: wait;
        backdrop-filter: blur(3px);

        .spinner-border {
            color: #d4d4d4 !important;
        }

        .loading-text {
            color: #a9a9a9;
        }
    }

    .charge-loader-pagination {
        padding: 15px 0;
        cursor: wait;

        .spinner-border {
            color: #d4d4d4 !important;
            width: 1.5rem;
            height: 1.5rem;
        }

        .loading-text {
            color: #a9a9a9;
        }
    }
}

.wallet-charge-create {
    padding-top: 20px;
    padding-bottom: 35px;

    .charge-type {
        top: 36px;
    }

    .charge-create {
        padding-top: 20px;
    }
}

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

.wallet-charge-item {
    border-left: 1px solid #eee;
    padding: 18px 45px 20px;
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

    .charge-header {
        cursor: pointer;

        .charge-amount {
            font-weight: 700;
            display: inline-block;
            width: 110px;
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

@include media-breakpoint-down(sm) {
    .charge-item .charge-main-container {
        border-left: 0;

        .charge-type {
            position: initial;
            vertical-align: middle;
            margin: 7px 20px 7px 0;
        }
    }

    .charges-list-group-title-placeholder {
        display: none;
    }
}
</style>
