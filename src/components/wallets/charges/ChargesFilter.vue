<template>
    <div class="row">
        <div class="charge-filter-state-container col-md-4 col-12">
            <b-badge variant="primary" v-show="dateFrom" class="date-state">
                From: {{ dateFrom }}
                <b-button @click="resetDateFrom">
                    <b-icon icon="x"></b-icon>
                </b-button>
            </b-badge>
            <b-badge variant="primary" v-show="dateTo" class="date-state">
                To: {{ dateTo }}
                <b-button @click="resetDateTo">
                    <b-icon icon="x"></b-icon>
                </b-button>
            </b-badge>
        </div>
        <div class="charge-filter-main-container col-md-8 col-12">
            <b-input-group class="grouped-filters">
                <b-form-datepicker placeholder="Date from" v-model="dateFrom" :date-format-options="dateFormatOptions"></b-form-datepicker>
                <b-form-datepicker placeholder="Date to" v-model="dateTo" :date-format-options="dateFormatOptions"></b-form-datepicker>
            </b-input-group>
            <div class="ungrouped-filters">
                <b-form-datepicker placeholder="Date from" v-model="dateFrom" :date-format-options="dateFormatOptions" class="mb-2"></b-form-datepicker>
                <b-form-datepicker placeholder="Date to" v-model="dateTo" :date-format-options="dateFormatOptions"></b-form-datepicker>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Watch, Vue, Component } from 'vue-property-decorator'

export interface FilterChangeEvent {
    dateFrom: string;
    dateTo: string;
}

@Component
export default class ChargesFilter extends Vue {
    public dateFrom = ''
    public dateTo = ''

    get dateFormatOptions() {
        return {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }
    }

    @Watch('dateFrom')
    @Watch('dateTo')
    protected onChange() {
        this.$emit('change', {
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
        })
    }

    protected resetDateFrom() {
        this.dateFrom = ''
    }

    protected resetDateTo() {
        this.dateTo = ''
    }
}
</script>

<style lang="scss" scoped>
@import "node_modules/bootstrap/scss/functions";
@import "node_modules/bootstrap/scss/variables";
@import "node_modules/bootstrap/scss/mixins/_breakpoints";

.ungrouped-filters {
    display: none;
}

.charge-filter-state-container {
    text-align: right;
    padding: 20px 35px 20px;
}
.charge-filter-main-container {
    padding: 20px 45px;
    border-left: 1px solid #eee;
}
.date-state {
    margin-left: 5px;

    button {
        font-size: 14px;
        margin: -6px -5px -5px 5px;
        line-height: 17px;
        padding: 0 6px 0;
        background: none;
        color: inherit;
        border-radius: 0 3px 3px 0;
        border: 0;

        &.loading {
            font-size: 12px;
        }

        &:hover {
            background-color: rgb(108 117 125 / 25%);
        }
    }
}

@include media-breakpoint-down(sm) {
    .date-state {
        margin-left: 0;
        margin-right: 5px;
    }

    .grouped-filters {
        display: none;
    }

    .ungrouped-filters {
        display: block;
    }

    .charge-filter-state-container {
        text-align: left;
        padding-left: 15px;
        padding-right: 15px;
        padding-bottom: 0;
    }

    .charge-filter-main-container {
        border-left: 0;
        padding-left: 15px;
        padding-right: 15px;
    }
}
</style>
