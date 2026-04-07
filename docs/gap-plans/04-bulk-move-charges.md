# Gap Plan 04: Bulk Move Charges Between Wallets

## What's Missing

The old `ChargesList.vue` allowed users to **select multiple charges** and move them to another wallet in one operation. This is useful for reorganizing transactions.

**How it worked in old app:**
1. Each `ChargeItem` had a click handler on the type icon (↑/↓) that toggled selection
2. `ChargesList` tracked `selectedCharges: ChargeInterface[]`
3. When any charges were selected, a "Move" dropdown button appeared
4. The dropdown listed other active wallets with their balance
5. Clicking a wallet called `moveCharges()` API and removed moved charges from the list

**New codebase:**
- `moveCharges(walletId, targetWalletId, chargeIds)` API function already exists in `src/api/charges.ts` ✓
- No selection state in `ChargeItem` or `ChargesList`
- No "Move" dropdown in `ChargesList`

---

## Files to Modify

### 1. `src/components/wallets/charges/ChargeItem.vue` — add selection toggle

Add `selectable` and `selected` props, emit `toggle-selected`:

```ts
const props = defineProps<{
    charge: Charge
    wallet: Wallet
    readOnly?: boolean
    selectable?: boolean
    selected?: boolean
}>()

const emit = defineEmits<{
    updated: [charge: Charge]
    deleted: [chargeId: string]
    'tag-selected': [tagId: number]
    'toggle-selected': [charge: Charge]
}>()
```

Make the operation icon (↑/↓ circle) clickable when `selectable`:

```html
<!-- Operation icon — clickable for selection when selectable -->
<button
    v-if="!isEditing"
    class="size-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
    :class="[
        selected
            ? 'bg-primary text-white'
            : charge.operation === '+' ? 'bg-success/10 text-success' : 'bg-error/10 text-error',
        selectable ? 'cursor-pointer hover:ring-2 ring-primary' : 'cursor-default'
    ]"
    :disabled="!selectable"
    @click.stop="selectable ? emit('toggle-selected', charge) : undefined"
>
    <UIcon v-if="selected" name="i-lucide-check" class="size-4" />
    <UIcon v-else-if="charge.operation === '+'" name="i-lucide-arrow-up" class="size-4" />
    <UIcon v-else name="i-lucide-arrow-down" class="size-4" />
</button>
```

### 2. `src/components/wallets/charges/ChargesList.vue` — selection and move

**State additions:**
```ts
import { moveCharges } from '@/api/charges'
import { useWalletsStore } from '@/stores/wallets'

const walletsStore = useWalletsStore()
const selectedCharges = ref<Charge[]>([])
const moveLoading = ref(false)
const moveError = ref<string | null>(null)
```

**Computed — other active wallets (move targets):**
```ts
const moveTargetWallets = computed(() =>
    walletsStore.activeWallets.filter(
        (w: Wallet) => w.isActive && w.id !== props.wallet.id
    )
)
```

**Selection handler:**
```ts
function onToggleSelected(charge: Charge) {
    const index = selectedCharges.value.findIndex(c => c.id === charge.id)
    if (index === -1) {
        selectedCharges.value.push(charge)
    } else {
        selectedCharges.value.splice(index, 1)
    }
}
```

**Move handler:**
```ts
async function onMoveTo(targetWallet: Wallet) {
    if (!selectedCharges.value.length) return
    moveLoading.value = true
    moveError.value = null
    try {
        await moveCharges(
            props.wallet.id,
            targetWallet.id,
            selectedCharges.value.map(c => c.id)
        )
        // Remove moved charges from list
        const movedIds = new Set(selectedCharges.value.map(c => c.id))
        charges.value = charges.value.filter(c => !movedIds.has(c.id))
        selectedCharges.value = []
    } catch {
        moveError.value = t('charges.moveError')
    } finally {
        moveLoading.value = false
    }
}
```

**Template — "Move" dropdown above the list:**
```html
<!-- Shown only when charges are selected and there are target wallets -->
<div v-if="selectedCharges.length && moveTargetWallets.length" class="flex items-center gap-2 px-4 py-2 border-b border-default bg-elevated">
    <span class="text-sm text-muted">
        {{ t('charges.selectedCount', { count: selectedCharges.length }) }}
    </span>

    <UDropdownMenu :items="moveDropdownItems">
        <UButton
            variant="outline"
            color="primary"
            size="sm"
            icon="i-lucide-move"
            :loading="moveLoading"
        >
            {{ t('charges.move') }}
        </UButton>
    </UDropdownMenu>

    <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        @click="selectedCharges = []"
    >
        {{ t('charges.clearSelection') }}
    </UButton>

    <UAlert v-if="moveError" color="warning" :description="moveError" class="flex-1" />
</div>
```

Where `moveDropdownItems`:
```ts
const moveDropdownItems = computed(() =>
    moveTargetWallets.value.map(w => ({
        label: w.defaultCurrency
            ? `${w.name} — ${format(w.totalAmount, w.defaultCurrency)}`
            : w.name,
        click: () => onMoveTo(w),
    }))
)
```

**Pass `selectable` and `selected` to ChargeItem:**
```html
<ChargeItem
    v-for="charge in groupCharges"
    :key="charge.id"
    :charge="charge"
    :wallet="wallet"
    :read-only="!wallet.isActive"
    :selectable="wallet.isActive"
    :selected="selectedCharges.some(c => c.id === charge.id)"
    @updated="onChargeUpdated"
    @deleted="onChargeDeleted"
    @tag-selected="(tagId) => emit('tag-selected', tagId)"
    @toggle-selected="onToggleSelected"
/>
```

**Clear selection when filter/wallet changes:**
```ts
watch(() => props.filter, () => {
    selectedCharges.value = []
    loadCharges(1)
}, { deep: true })
watch(() => props.wallet.id, () => {
    selectedCharges.value = []
    loadCharges(1)
})
```

---

## i18n Keys Required

Add to `en.ts` and `uk.ts` if missing:

- `charges.move` — "Move" button label (likely exists)
- `charges.moveError` — "Unable to move charges" error message (likely exists)
- `charges.selectedCount` — "{count} selected" (may be new)
- `charges.clearSelection` — "Clear" (may be new)

---

## Testing

- Inactive wallet (archived/disabled) → type icons not clickable, no Move button
- Active wallet → click type icon on a charge → icon shows checkmark, charge is highlighted
- Click again → deselected
- Select 2 charges → "2 selected" + Move dropdown appear; "Move" lists other active wallets
- Click a wallet in Move → charges removed from list, selection cleared, no Move button
- Move failure → error message shown, charges still in list, selection preserved
- Change filter/wallet → selection cleared

---

## Acceptance Criteria

- [ ] `ChargeItem` accepts `selectable` and `selected` props
- [ ] Clicking type icon when `selectable` toggles `toggle-selected` event
- [ ] `ChargesList` tracks `selectedCharges`
- [ ] "Move" dropdown button shown when ≥1 charge selected
- [ ] Move dropdown lists other active wallets with balances
- [ ] Selecting a wallet calls `moveCharges()` and removes moved charges
- [ ] "Clear" button deselects all
- [ ] Selection cleared on filter/wallet change
- [ ] Error message shown on move failure
