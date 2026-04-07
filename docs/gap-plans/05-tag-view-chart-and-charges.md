# Gap Plan 05: TagView — Flow Chart and Full ChargeItem

## What's Missing

The old `TagView.vue` had two features the new version lacks:

### A. ChargesFlowChart on the tag page

The old TagView showed a `ChargesFlowChart` bar chart (income vs expense over time) for the selected tag, with a group-by selector (Day / Month / Year). This is the same chart used on WalletView but fetches data from the tag graph endpoint.

**MIGRATION.md note:** "ChargesFlowChart also skipped for the same reason — only getTagTotals() income/expense summary is shown."

The reason given was that `ChargesList` requires a `Wallet` object — but that's for `ChargesList`, not for the chart. The chart can be added independently.

### B. Full ChargeItem instead of simplified inline list

The old TagView used the full `ChargesList` component, which renders `ChargeItem` rows with:
- Expand/collapse on click (shows description)
- Edit and delete actions (dropdown menu)
- User avatar
- Tag chips (clickable, navigates to tag page)
- Inline edit form

The new TagView has a simplified read-only flat list (just title, date, amount). There is no edit or delete capability, no description visible, no user avatar, and no expand/collapse.

The challenge: `ChargesList` requires a `Wallet` prop, but in TagView the charges can come from multiple wallets.

---

## Part A: Add ChargesFlowChart to TagView

### 1. `src/api/graph.ts` — add tag graph function

```ts
export async function getTagChargesFlow(
    tagId: number,
    params?: GetChargesFlowParams,
): Promise<ChargesFlowDataPoint[]> {
    return apiCall(async client => {
        const res = await client.get(`/api/tags/${tagId}/charges/graph`, { params })
        return (res.data.data as unknown[]).map(item => {
            const d = item as Record<string, unknown>
            return {
                date: typeof d.date === 'string' ? d.date : '',
                timestamp: typeof d.timestamp === 'number' ? d.timestamp : 0,
                income: typeof d.income === 'number' ? d.income : 0,
                expense: typeof d.expense === 'number' ? d.expense : 0,
            }
        })
    })
}
```

> **API endpoint:** `GET /api/tags/{tagId}/charges/graph` — confirmed in old `GraphRepository.getTagGraph()`.

### 2. `src/views/TagView.vue` — add ChargesFlowChart

Import and add the chart after the totals section, before the filter toggle:

```ts
import ChargesFlowChart from '@/components/wallets/charges/ChargesFlowChart.vue'
```

The chart component currently takes `walletId` as a required prop. It needs to be extended to also accept a `tagId` prop (see note below).

**Option A (simpler): Create a `TagChargesFlowChart.vue`**

Duplicate `ChargesFlowChart` logic but call `getTagChargesFlow(tagId, params)` instead of `getChargesFlowByDate(walletId, params)`. Avoids modifying the shared chart component.

**Option B (cleaner): Make `ChargesFlowChart` accept either `walletId` or `tagId`**

Extend the props interface:
```ts
const props = defineProps<{
    walletId?: number
    tagId?: number
    currency: Currency | null
    tags?: Tag[]
}>()
```

Then in `loadData()`:
```ts
async function loadData() {
    const params: GetChargesFlowParams = { 'group-by': groupBy.value }
    if (props.walletId) {
        dataPoints.value = await getChargesFlowByDate(props.walletId, params)
    } else if (props.tagId) {
        dataPoints.value = await getTagChargesFlow(props.tagId, params)
    }
}
```

**Recommendation: Option A** — simpler, no risk of breaking WalletView's usage, consistent with migration convention of small focused components.

**Add to TagView template:**
```html
<!-- Chart (after totals) -->
<div class="border border-default rounded-lg p-4">
    <TagChargesFlowChart
        :tag-id="tagId"
        :currency="totals?.currency ?? null"
    />
</div>
```

---

## Part B: Full ChargeItem in TagView

### Problem

`ChargesList.vue` requires `wallet: Wallet` prop (for create charge form, wallet name display, and read-only status). In TagView, charges come from multiple wallets. The charge data model includes `charge.wallet: WalletShort` which provides enough context.

### Solution Options

**Option A: Extend `ChargesList` to accept `tagId` instead of `wallet`**

When `tagId` is provided (instead of `wallet`):
- Calls `getTagCharges(tagId, page)` for loading
- Does not show create charge form
- Passes `charge.wallet` to each `ChargeItem` as the wallet context

This is the cleanest reuse solution.

**Option B: Replace simplified list in TagView with direct `ChargeItem` usage**

Remove the current flat list in TagView and use `ChargeItem` directly in a loop, passing `charge.wallet` as the wallet prop:

```html
<div class="border border-default rounded-lg divide-y divide-default">
    <ChargeItem
        v-for="charge in charges"
        :key="charge.id"
        :charge="charge"
        :wallet="charge.wallet"
        :read-only="false"
        @updated="onChargeUpdated"
        @deleted="onChargeDeleted"
        @tag-selected="onTagSelected"
    />
</div>
```

> **Note:** `ChargeItem` currently expects `wallet: Wallet` but `charge.wallet` is `WalletShort`. Either update `ChargeItem` to accept `WalletShort | null` or cast.

**Recommendation: Option B** — simpler to implement without changing `ChargesList`. `ChargeItem` only needs `wallet` for `updateCharge(wallet.id, ...)` and `deleteCharge(wallet.id, ...)` calls, so `WalletShort` is sufficient (it has `id`).

### Implementation for Option B

**Update `ChargeItem.vue` wallet prop type:**

```ts
import type { WalletShort } from '@/api/models/wallet'

const props = defineProps<{
    charge: Charge
    wallet: Wallet | WalletShort  // allow WalletShort
    readOnly?: boolean
    selectable?: boolean
    selected?: boolean
}>()
```

**Update `TagView.vue`:**

```ts
import ChargeItem from '@/components/wallets/charges/ChargeItem.vue'
```

Replace the simplified list with ChargeItem:
```html
<div class="border border-default rounded-lg">
    <ChargeItem
        v-for="charge in charges"
        :key="charge.id"
        :charge="charge"
        :wallet="charge.wallet!"
        :read-only="false"
        @updated="onChargeUpdated"
        @deleted="onChargeDeleted"
        @tag-selected="onTagSelected"
    />
    <!-- Empty state -->
    <div v-if="!charges.length && !loading" class="flex flex-col items-center justify-center py-12 text-muted">
        <UIcon name="i-lucide-receipt" class="size-10 mb-2 opacity-30" />
        <p class="text-sm">{{ t('charges.empty') }}</p>
    </div>
</div>
```

**Add event handlers in TagView:**
```ts
async function onChargeUpdated(charge: Charge) {
    // Update in-place
    const index = charges.value.findIndex(c => c.id === charge.id)
    if (index !== -1) charges.value[index] = charge
    // Refresh totals since amount may have changed
    await loadTotals()
}

async function onChargeDeleted(chargeId: string) {
    charges.value = charges.value.filter(c => c.id !== chargeId)
    await loadTotals()
}

function onTagSelected(tagId: number) {
    // Navigate to that tag's page
    router.push({ name: 'tags.show', params: { tagID: tagId.toString() } })
}
```

**Keep infinite scroll / load more:** The current manual "Load more" button works. Optionally upgrade to IntersectionObserver (matching WalletView pattern), but the manual button is acceptable.

---

## Filter Support for Chart

The chart should respect the filter (date range). Wire `filter` state to the chart reload:

```ts
watch(filter, () => {
    // reload totals and chart with new filter
    loadTotals()
    // chart exposes reload() method
    chartRef.value?.reload()
}, { deep: true })
```

Pass filter dates to `getTagChargesFlow`:
```ts
const params: GetChargesFlowParams = {
    'group-by': groupBy.value,
}
if (filter.value.dateFrom) params['date-from'] = filter.value.dateFrom
if (filter.value.dateTo) params['date-to'] = filter.value.dateTo
dataPoints.value = await getTagChargesFlow(props.tagId, params)
```

---

## Testing

**Chart:**
- Tag with charges → bar chart renders below totals
- Group-by selector changes grouping
- Applying date filter → chart reloads
- Tag with no charges → chart shows empty state

**ChargeItem integration:**
- Charges load and display with expand/collapse
- Click charge row → expands to show description (if any) and full time
- Edit charge → inline form appears, save updates the charge in list and totals
- Delete charge → removed from list, totals update
- Click tag chip on charge → navigates to that tag's page

---

## Acceptance Criteria

**Part A:**
- [ ] `getTagChargesFlow(tagId, params)` added to `src/api/graph.ts`
- [ ] `TagChargesFlowChart.vue` (or extended `ChargesFlowChart`) renders tag charges over time
- [ ] Group-by dropdown (Day / Month / Year) works
- [ ] Chart shown in `TagView.vue` after totals
- [ ] Chart reloads when filter changes

**Part B:**
- [ ] `ChargeItem` accepts `Wallet | WalletShort` for wallet prop
- [ ] TagView uses `ChargeItem` instead of simplified flat list
- [ ] Expand/collapse works
- [ ] Edit/delete work (call correct wallet API)
- [ ] Tag click navigates to tag page
- [ ] Charge update/delete refreshes totals
