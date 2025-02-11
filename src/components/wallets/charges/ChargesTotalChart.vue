<template>
    <Pie
        :chart-options="chartOptions"
        :chart-data="chartData"
        :chart-id="chartId"
        :dataset-id-key="datasetIdKey"
    />
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Pie } from 'vue-chartjs/legacy'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    ChartData,
    PieDataPoint, ChartOptions
} from 'chart.js'
import 'chartjs-adapter-moment';
import { CurrencyInterface } from '@/api/currency';
import { TotalGraphDataEntry } from '@/api/graph';
import { TagInterface } from '@/api/tags';
import { money } from '@/shared/numbers';

ChartJS.register(Title, Tooltip, Legend, ArcElement)

@Component({
    components: { Pie }
})
export default class ChargesTotalChart extends Vue {
    chartId = `pie-chart`
    datasetIdKey = 'label'

    @Prop()
    currency!: CurrencyInterface

    @Prop()
    dataset!: Array<TotalGraphDataEntry>

    @Prop()
    chargeType!: string

    @Prop()
    tags!: Array<TagInterface>

    @Prop()
    tagsFiltered!: Array<TagInterface>

    // If more than threshold amount tags found then the percentage threshold applied
    // otherwise all is visible
    private readonly hideThresholdAmount = 8;

    // Hide all tags whose amount falls behind percentage threshold against total amount
    private readonly hideThresholdPercent = 15;

    created() {
        this.chartId = 'pie-chart-' + this.chargeType
    }

    get chartData(): ChartData {
        const labels = new Array<string>()
        const data = new Array<PieDataPoint>()
        const colors = new Array<string>()

        for (const entry of this.filteredDataset) {
            const tags = this.getTagsByIds(entry.tags)
            let label = this.getTagsLabelByTags(tags)

            label = `${label} ${((entry.amount / this.totalSum) * 100).toFixed(0)}%`

            labels.push(label)
            data.push(entry.amount)
            colors.push(this.randomHexColor(label))
        }

        return {
            labels: labels,
            datasets: [{
                backgroundColor: colors,
                normalized: true,
                parsing: false,
                data: data,
            }]
        }
    }

    get totalSum(): number {
        let sum = 0

        for (const entry of this.dataset) {
            sum += entry.amount
        }

        return sum
    }

    private visibleCount = 0

    get visibleTagsCount(): number {
        if (this.dataset.length <= this.hideThresholdAmount) {
            return this.dataset.length
        }

        const totalSum = this.totalSum
        const visiblePercent = 100 - this.hideThresholdPercent

        this.visibleCount = 0
        let capSum = 0

        for (const entry of this.dataset) {
            if (((capSum / totalSum) * 100) > visiblePercent) {
                break;
            }

            capSum += entry.amount
            this.visibleCount += 1
        }

        return this.visibleCount
    }

    get filteredDataset(): Array<TotalGraphDataEntry> {
        const result: Array<TotalGraphDataEntry> = []
        const visibleTagsCount = this.visibleTagsCount
        const dataset = this.dataset.slice() // copy array

        result.push(...dataset.splice(0, visibleTagsCount))

        if (dataset.length === 0) {
            return result
        }

        const lastElem: TotalGraphDataEntry = {
            amount: 0,
            tags: [-1]
        }
        for (const entry of dataset) {
            lastElem.amount += entry.amount
        }

        result.push(lastElem)

        return result
    }

    get chartOptions(): ChartOptions {
        return {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.2,
            plugins: {
                legend: {
                    fullSize: true,
                    position: 'left',
                },
                tooltip: {
                    callbacks: {
                        label: context => {
                            const withoutPercent = context.label.replace(/\b\d{1,3}%/g, '')
                            let label = `    ${withoutPercent}`;

                            if (context.parsed !== null && this.currency !== null) {
                                label += ' — ';
                                label += money(context.parsed, this.currency)
                            }

                            return label;
                        }
                    }
                }
            }
        }
    }

    getTagsLabelByTags(tags: Array<TagInterface>): string {
        const labels: Array<string> = [];

        for (const tag of tags) {
            let label = `${tag.name}`

            if (tag.icon !== null && tag.icon.length > 0) {
                label = `${tag.icon} ${label}`
            }

            labels.push(label)
        }

        if (labels.length === 0) {
            return this.$t('tags.withoutTags').toString()
        }

        return labels.join(', ')
    }

    getTagsByIds(ids: Array<number>): Array<TagInterface> {
        const tags = new Array<TagInterface>()

        for (const id of ids) {
            const tag = this.getTagById(id)
            if (tag === null) {
                continue
            }
            tags.push(tag)
        }

        return tags
    }

    getTagById(id: number): TagInterface|null {
        for (const tag of this.tags) {
            if (id === tag.id) {
                return tag
            }
        }

        if (id === -1) {
            return {
                id: -1,
                name: this.$t('tags.otherTags', [this.dataset.length - this.visibleCount]).toString(),
                color: null,
                icon: null,
                userId: 0,
                createdAt: '',
                updatedAt: ''

            }
        }

        return null;
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
