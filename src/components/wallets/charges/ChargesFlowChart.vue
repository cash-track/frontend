<template>
    <Bar
        :chart-options="chartOptions"
        :chart-data="chartData"
        :chart-id="chartId"
        :dataset-id-key="datasetIdKey"
    />
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Bar } from 'vue-chartjs/legacy'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    TimeScale,
    ChartOptions,
    ChartData,
    TimeUnit,
    ChartDataset
} from 'chart.js'
import 'chartjs-adapter-moment';
import { CurrencyInterface } from '@/api/currency';
import { money } from '@/shared/numbers';
import { GraphDataEntry, GROUP_BY_DAY, GROUP_BY_MONTH, GROUP_BY_YEAR } from '@/api/graph';
import { TypeExpense, TypeIncome } from '@/api/charges';
import { TagInterface } from '@/api/tags';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, TimeScale)

@Component({
    components: { Bar }
})
export default class ChargesFlowChart extends Vue {
    chartId = 'bar-chart'
    datasetIdKey = 'label'

    @Prop()
    currency!: CurrencyInterface

    @Prop()
    dataset!: Array<GraphDataEntry>

    @Prop()
    group!: string

    @Prop()
    tags!: Array<TagInterface>

    get chartData(): ChartData {
        const datasets = new Array<ChartDataset>()

        if (this.tags !== undefined && this.tags.length) {
            for (const tag of this.tags) {
                const tagName = tag.name

                if (this.checkDatasetForTagHasValues(TypeExpense, tag)) {
                    const label = `↓ ${tagName}`
                    datasets.push({
                        label: label,
                        backgroundColor: this.tags.length === 1 ? '#dc3545' : this.randomHexColor(label),
                        stack: 'expense',
                        normalized: true,
                        parsing: false,
                        data: this.parseDatasetForTag(TypeExpense, tag),
                    })
                }

                if (this.checkDatasetForTagHasValues(TypeIncome, tag)) {
                    const label = `↑ ${tagName}`
                    datasets.push({
                        label: label,
                        backgroundColor: this.tags.length === 1 ? '#28a745' : this.randomHexColor(label),
                        stack: 'income',
                        normalized: true,
                        parsing: false,
                        data: this.parseDatasetForTag(TypeIncome, tag),
                    })
                }
            }
        } else {
            datasets.push({
                label: this.$t('wallets.expense').toString(),
                backgroundColor: '#dc3545',
                stack: 'bar',
                normalized: true,
                parsing: false,
                data: this.parseDataset(TypeExpense),
            })
            datasets.push({
                label: this.$t('wallets.income').toString(),
                backgroundColor: '#28a745',
                stack: 'bar1',
                normalized: true,
                parsing: false,
                data: this.parseDataset(TypeIncome),
            })
        }

        return {
            datasets: datasets
        }
    }

    get chartOptions(): ChartOptions {
        return {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    ticks: {
                        callback: (value) => {
                            if (typeof value !== 'number') {
                                return value
                            }

                            if (this.currency === null) {
                                return value
                            }

                            return money(value, this.currency)
                        }
                    }
                },
                x: {
                    type: 'time',
                    ticks: {
                        source: 'data',
                    },
                    time: {
                        tooltipFormat: this.tooltipFormat,
                        unit: this.timeUnit,
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => {
                            let label = context.dataset.label || '';

                            if (label) {
                                label += ': ';
                            }

                            if (context.parsed.y !== null && this.currency !== null) {
                                label += money(context.parsed.y, this.currency)
                            }

                            return label;
                        }
                    }
                }
            }
        }
    }

    get tooltipFormat(): string {
        switch (this.group) {
            case GROUP_BY_MONTH:
                return 'MMM YYYY'
            case GROUP_BY_YEAR:
                return 'YYYY'
            case GROUP_BY_DAY:
            default:
                return 'D MMM YYYY'
        }
    }

    get timeUnit(): TimeUnit {
        switch (this.group) {
            case GROUP_BY_MONTH:
                return 'month'
            case GROUP_BY_YEAR:
                return 'year'
            case GROUP_BY_DAY:
            default:
                return 'day'
        }
    }

    private parseDataset(type: string) {
        if (this.dataset === null) {
            return []
        }

        const data = []

        for (const item of this.dataset) {
            const value = type === TypeIncome ? item.income: item.expense

            data.push({
                x: item.timestamp * 1000,
                y: value !== undefined ? value : 0,
            })
        }

        return data
    }

    private parseDatasetForTag(type: string, tag: TagInterface) {
        if (this.dataset === null) {
            return []
        }

        const data = []

        for (const item of this.dataset) {
            let value = undefined

            if (item.tags !== undefined && Object.prototype.hasOwnProperty.call(item.tags, tag.id)) {
                value = type === TypeIncome ? item.tags[tag.id].income : item.tags[tag.id].expense
            }

            data.push({
                x: item.timestamp * 1000,
                y: value !== undefined ? value : 0,
            })
        }

        return data
    }

    private checkDatasetForTagHasValues(type: string, tag: TagInterface): boolean {
        if (this.dataset === null) {
            return false
        }

        for (const item of this.dataset) {
            let value = undefined

            if (item.tags !== undefined && Object.prototype.hasOwnProperty.call(item.tags, tag.id)) {
                value = type === TypeIncome ? item.tags[tag.id].income : item.tags[tag.id].expense
            }

            if (value !== undefined && value > 0) {
                return true
            }
        }

        return false
    }

    private randomHexColor(name: string): string {
        let hash = 0

        if (name.length === 0) {
            return ''
        }

        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }

        let color = '#';

        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 255;
            color += ('00' + value.toString(16)).substr(-2);
        }

        return color;
    }
}
</script>

<style lang="scss" scoped>

</style>
