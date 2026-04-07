# Gap Plan 02: WalletView Tags Section with Tag-Stacking Charts

## What's Missing

The old `WalletView.vue` had a collapsible **Tags section** that allowed users to:

1. See all tags used in the wallet as clickable chips
2. Click a tag to select it (adds to active filter), click again to deselect
3. See per-tag income/expense amounts and percentages below the selected tags
4. Pass the selected tags to `ChargesFlowChart` to render tag-stacked bars instead of type-stacked (income/expense) bars
5. Pass selected tags to `ChargesList` as a tag filter (filters charges to only those with selected tags)

**New codebase gaps:**
- No "Tags" toggle button in WalletView toolbar
- No collapsible tags section
- `ChargesFlowChart` does not support tag-stacking mode (only renders income vs expense)
- `ChargesList` filter does not pass tags (it passes only date range)
- The `tag-selected` event emitted by `ChargesList` → `ChargeItem` is not handled in `WalletView`

---

## Data Sources

### Wallet tags
API already exists: `getWalletTags(walletId)` in `src/api/tags.ts` → returns `Tag[]`

### Per-tag totals
Already included in `WalletTotal.tags` (array of `{tagId, totalIncomeAmount, totalExpenseAmount}`). This is already fetched by `getWalletTotals(walletId)` in `WalletView`. The `WalletTotal` model (in `src/api/models/wallet.ts`) has a `tags` field — verify it is populated from the API response.

### Tag-stacking chart data
`getChargesFlowByDate(walletId, params)` in `src/api/graph.ts` already accepts a `tags?: string` param in `GetChargesFlowParams`. The API endpoint returns per-tag breakdowns in the response when tags are filtered. The old graph data included a `tags: Record<number, {income, expense}>` per entry — check if `ChargesFlowDataPoint` includes this field; if not, extend it.

---

## Files to Modify

### 1. `src/api/models/wallet.ts` — verify/extend `WalletTotal`

Confirm that `WalletTotal` includes the `tags` array from the API response. The OpenAPI spec shows `tags` as an array of objects with `{tagId, totalIncomeAmount, totalExpenseAmount}`. If missing, add it:

```ts
export interface WalletTotalTag {
    tagId: number
    totalIncomeAmount: number
    totalExpenseAmount: number
}

// In WalletTotal class:
readonly tags: WalletTotalTag[]
```

### 2. `src/api/graph.ts` — extend `ChargesFlowDataPoint`

The old graph response included per-tag breakdowns per data point. Check if the API returns `tags: Record<number, {income, expense}>` per entry. If so, extend:

```ts
export interface ChargesFlowTagEntry {
    income: number
    expense: number
}

export interface ChargesFlowDataPoint {
    date: string
    timestamp: number
    income: number
    expense: number
    tags?: Record<number, ChargesFlowTagEntry>  // add this
}
```

### 3. `src/views/WalletView.vue` — add tags section

Add to state:
```ts
const walletTags = ref<Tag[]>([])
const selectedTags = ref<Tag[]>([])
const showTags = ref(false)

// Computed: per-tag totals (from totals.value.tags + walletTags)
const totalPerTags = computed(() => {
    if (!totals.value?.tags || !selectedTags.value.length) return []
    // ... merge total data with tag objects, compute percentages
})
```

Add loading:
```ts
// In loadWallet() after loading:
walletTags.value = await getWalletTags(walletId)
```

Add "Tags" button to toolbar (alongside existing Add Charge / Limits / Graph / Filter):
```html
<UButton
    variant="outline"
    color="neutral"
    size="sm"
    icon="i-lucide-tags"
    :disabled="!walletTags.length"
    :class="{ '!bg-elevated': showTags }"
    @click="showTags = !showTags"
>
    {{ t('wallets.tags') }}
</UButton>
```

Add collapsible tags section:
```html
<div v-if="showTags" class="border border-default rounded-lg p-4 mb-4">
    <!-- Tag chips (unselected) -->
    <div class="flex flex-wrap gap-2 mb-3">
        <Tag
            v-for="tag in walletTags"
            v-show="!isTagSelected(tag.id)"
            :key="tag.id"
            :tag="tag"
            @selected="onTagSelected"
        />
        <UButton
            v-if="selectedTags.length"
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-x"
            @click="selectedTags = []"
        >
            {{ t('wallets.clear') }}
        </UButton>
    </div>

    <!-- Per-tag totals for selected tags -->
    <div v-for="item in totalPerTags" :key="item.tagId" class="flex justify-between items-center py-2 border-t border-default">
        <Tag :tag="item.tag" state="closable" @selected="onTagSelected" />
        <div class="flex gap-4 text-sm">
            <span v-if="item.hasIncome" class="text-success font-semibold">
                ↑ {{ format(item.totalIncomeAmount, wallet!.defaultCurrency!) }}
                <span class="text-muted text-xs">/ {{ item.incomePercent }}%</span>
            </span>
            <span v-if="item.hasExpense" class="text-error font-semibold">
                ↓ {{ format(item.totalExpenseAmount, wallet!.defaultCurrency!) }}
                <span class="text-muted text-xs">/ {{ item.expensePercent }}%</span>
            </span>
        </div>
    </div>
</div>
```

Wire up tag selection to filter:
```ts
function onTagSelected(tag: Tag) {
    const index = selectedTags.value.findIndex(t => t.id === tag.id)
    if (index === -1) {
        selectedTags.value.push(tag)
    } else {
        selectedTags.value.splice(index, 1)
    }
}

function isTagSelected(id: number) {
    return selectedTags.value.some(t => t.id === id)
}

// Watch selectedTags → update filter and reload totals/charts
watch(selectedTags, () => {
    tagFilterString.value = selectedTags.value.map(t => t.id).join(',')
    refreshTotals()
    if (showGraph.value) {
        flowChartRef.value?.reload()
        totalChartRef.value?.reload()
    }
}, { deep: true })
```

Pass tag IDs to ChargesFlowChart and ChargesList:
```html
<ChargesFlowChart
    ref="flowChartRef"
    :wallet-id="wallet.id"
    :currency="wallet.defaultCurrency"
    :tags="selectedTags"
/>
<ChargesList
    :wallet="wallet"
    :filter="{ ...filter, tags: tagFilterString }"
    @tag-selected="onTagFromCharge"
/>
```

Handle `tag-selected` from ChargeItem (emitted when user clicks a tag chip on a charge row):
```ts
function onTagFromCharge(tagId: number) {
    const tag = walletTags.value.find(t => t.id === tagId)
    if (tag) {
        showTags.value = true
        onTagSelected(tag)
    }
}
```

### 4. `src/components/wallets/charges/ChargesFlowChart.vue` — add tag-stacking mode

Add `tags` prop:
```ts
const props = defineProps<{
    walletId: number
    currency: Currency | null
    tags?: Tag[]  // new: selected tags for stacking mode
}>()
```

When `tags` is non-empty, build tag-stacked datasets instead of the simple income/expense pair:
```ts
const chartData = computed<ChartData<'bar'>>(() => {
    if (props.tags && props.tags.length > 0) {
        // Tag-stacking mode
        const datasets: ChartDataset<'bar'>[] = []
        for (const tag of props.tags) {
            const expenseData = dataPoints.value.map(d => -(d.tags?.[tag.id]?.expense ?? 0))
            const incomeData = dataPoints.value.map(d => d.tags?.[tag.id]?.income ?? 0)
            if (expenseData.some(v => v !== 0)) {
                datasets.push({
                    label: `↓ ${tag.name}`,
                    backgroundColor: stableColor(`↓ ${tag.name}`),
                    stack: 'expense',
                    data: expenseData,
                })
            }
            if (incomeData.some(v => v !== 0)) {
                datasets.push({
                    label: `↑ ${tag.name}`,
                    backgroundColor: stableColor(`↑ ${tag.name}`),
                    stack: 'income',
                    data: incomeData,
                })
            }
        }
        return { labels: dataPoints.value.map(d => d.date), datasets }
    }
    // Default: income/expense mode (existing logic)
    return { ... }
})
```

`stableColor(label)` — hash-based deterministic color from label string (port from old `ChargesFlowChart`):
```ts
function stableColor(label: string): string {
    let hash = 0
    for (const char of label) hash = (hash << 5) - hash + char.charCodeAt(0)
    hash = hash & hash
    const h = Math.abs(hash) % 360
    return `hsl(${h}, 60%, 50%)`
}
```

Also pass `tags` IDs to the API call when reloading (so the API returns tag-level breakdown):
```ts
async function loadData() {
    const params: GetChargesFlowParams = { 'group-by': groupBy.value }
    if (props.tags?.length) {
        params.tags = props.tags.map(t => t.id).join(',')
    }
    dataPoints.value = await getChargesFlowByDate(props.walletId, params)
}
```

### 5. `src/components/wallets/charges/ChargesList.vue` — accept tag filter

Extend `FilterState`:
```ts
// In ChargesFilter.vue or a shared types file:
export interface FilterState {
    dateFrom: string
    dateTo: string
    tags?: string  // comma-separated tag IDs
}
```

Pass tags to API call:
```ts
const params: GetChargesParams = { page }
if (props.filter?.dateFrom) params['date-from'] = props.filter.dateFrom
if (props.filter?.dateTo) params['date-to'] = props.filter.dateTo
if (props.filter?.tags) params.tags = props.filter.tags  // add this
```

---

## Testing

- Wallet with tags → Tags button enabled; Tags button disabled when wallet has no tags
- Click Tags button → section opens with all wallet tag chips
- Click tag chip → it disappears from unselected list, appears in selected row with income/expense stats
- Click selected tag (closable) → deselected, removed from totals row
- Clear button → all tags deselected
- With tag selected → ChargesFlowChart shows tag-stacked bars (if data exists)
- With tag selected → ChargesList filters to charges with that tag
- Click a tag on a charge row → showTags opens, tag added to selection

---

## Acceptance Criteria

- [ ] "Tags" toggle button in WalletView toolbar (disabled when no wallet tags)
- [ ] Tags section shows all wallet tag chips
- [ ] Click tag → selected; click again → deselected
- [ ] Selected tags show per-tag income/expense amounts and percentages
- [ ] Clear button resets all selections
- [ ] ChargesFlowChart switches to tag-stacking mode when tags selected
- [ ] ChargesList filters by selected tags
- [ ] Tag click on charge row wires back to tags section
- [ ] `FilterState` extended with optional `tags` field
