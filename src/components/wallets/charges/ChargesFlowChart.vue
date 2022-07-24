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
    LinearScale, TimeScale, ChartOptions, ChartData, TimeUnit
} from 'chart.js'
import 'chartjs-adapter-moment';
import { CurrencyInterface } from '@/api/currency';
import { money } from '@/shared/numbers';
import { GraphDataEntry, GROUP_BY_DAY, GROUP_BY_MONTH, GROUP_BY_YEAR } from '@/api/graph';
import { TypeExpense, TypeIncome } from '@/api/charges';

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

    get chartData(): ChartData {
        return {
            datasets: [
                {
                    label: 'Expense',
                    backgroundColor: '#dc3545',
                    stack: 'bar',
                    normalized: true,
                    parsing: false,
                    data: this.expenseData,
                },
                {
                    label: 'Income',
                    backgroundColor: '#28a745',
                    stack: 'bar',
                    normalized: true,
                    parsing: false,
                    data: this.incomeData,
                }
            ]
        }
    }

    get incomeData() {
        return this.parseDataset(TypeIncome)
    }

    get expenseData() {
        return this.parseDataset(TypeExpense)
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
            data.push({
                x: item.timestamp * 1000,
                y: type === TypeIncome ? item.income: item.expense,
            })
        }

        return data
    }
}
</script>

<style lang="scss" scoped>

</style>
