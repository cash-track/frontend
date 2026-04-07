# Gap Plan 03: Copy Limits from Another Wallet

## What's Missing

The old `WalletView.vue` had a "Copy From" dropdown button in the limits section. When the current wallet has **no limits** and other wallets have limits, users can copy all limits from another wallet with one click.

**New codebase:**
- `copyLimits(walletId, sourceWalletId)` API function already exists in `src/api/limits.ts` ✓
- `WalletLimitsTotal.vue` has no "Copy From" UI
- `getWalletsWithLimits()` API function is missing from `src/api/wallets.ts`

---

## Behaviour (from old app)

1. When `limits.length === 0`, the limits section automatically loads wallets that have limits
2. It first checks unarchived wallets (`/api/wallets/has-limits`), then archived (`/api/wallets/has-limits?archived`) as fallback
3. If any such wallets are found, a "Copy From" dropdown button appears alongside "Add Limit"
4. Dropdown lists wallet names; selecting one calls `copyLimits(currentWalletId, sourceWalletId)`
5. After copy, the limits list is updated with the copied limits (API returns the new limits)
6. "Copy From" button disappears once limits exist

---

## Files to Modify

### 1. `src/api/wallets.ts` — add `getWalletsWithLimits`

```ts
export async function getWalletsWithLimits(archived = false): Promise<Wallet[]> {
    return apiCall(async client => {
        const url = archived ? '/api/wallets/has-limits?archived' : '/api/wallets/has-limits'
        const res = await client.get(url)
        return (res.data.data as unknown[]).map(Wallet.from)
    })
}
```

> **API endpoint:** `GET /api/wallets/has-limits` (unarchived) and `GET /api/wallets/has-limits?archived` (archived) — confirmed in old `WalletsRepository.getHasLimits()`.

### 2. `src/components/wallets/limits/WalletLimitsTotal.vue` — add Copy From

**State additions:**
```ts
import { getWalletsWithLimits } from '@/api/wallets'
import { copyLimits } from '@/api/limits'

const walletsWithLimits = ref<Wallet[]>([])
const copyLoading = ref(false)
```

**Load wallets-with-limits when no limits exist:**
```ts
async function loadWalletsWithLimits() {
    try {
        let wallets = await getWalletsWithLimits(false)
        if (wallets.length === 0) {
            wallets = await getWalletsWithLimits(true)
        }
        // Exclude current wallet from the list
        walletsWithLimits.value = wallets.filter(w => w.id !== props.wallet.id)
    } catch {
        // Non-fatal; just don't show the button
    }
}

async function loadLimits() {
    loading.value = true
    try {
        limits.value = await getLimits(props.wallet.id)
        if (limits.value.length === 0) {
            await loadWalletsWithLimits()
        } else {
            walletsWithLimits.value = []  // clear if limits exist
        }
    } catch {
        // Silently fail
    } finally {
        loading.value = false
    }
}
```

**Copy handler:**
```ts
async function onCopyFrom(sourceWallet: Wallet) {
    copyLoading.value = true
    try {
        limits.value = await copyLimits(props.wallet.id, sourceWallet.id)
        walletsWithLimits.value = []  // hide the button after copy
    } catch {
        // Show error notification
    } finally {
        copyLoading.value = false
    }
}
```

**Template addition (after the "Add Limit" button):**

```html
<!-- Copy From dropdown — shown only when no limits exist and other wallets have limits -->
<UDropdownMenu
    v-if="!limits.length && walletsWithLimits.length"
    :items="copyDropdownItems"
>
    <UButton
        variant="outline"
        color="neutral"
        size="sm"
        icon="i-lucide-copy"
        :loading="copyLoading"
    >
        {{ t('limits.copyFrom') }}
    </UButton>
</UDropdownMenu>
```

Where `copyDropdownItems` is computed:
```ts
const copyDropdownItems = computed(() =>
    walletsWithLimits.value.map(w => ({
        label: w.name,
        click: () => onCopyFrom(w),
    }))
)
```

---

## i18n Keys

Verify these keys exist in both `en.ts` and `uk.ts` (they should already, since the old app had them):

- `limits.copyFrom` — "Copy From" button label
- `limits.createLimit` — "Add Limit" button label (already used)

---

## Testing

- Wallet with existing limits → "Copy From" button not shown
- Wallet with no limits, no other wallets have limits → "Copy From" button not shown
- Wallet with no limits, other unarchived wallets have limits → "Copy From" dropdown shows those wallets
- Wallet with no limits, only archived wallets have limits → "Copy From" dropdown shows archived wallets
- Select a wallet from dropdown → limits copied, list updates, "Copy From" disappears
- Copy failure → error notification shown, button re-enabled

---

## Acceptance Criteria

- [x] `getWalletsWithLimits(archived)` added to `src/api/wallets.ts`
- [x] "Copy From" dropdown shown in `WalletLimitsTotal` when `limits.length === 0` and other wallets have limits
- [x] Dropdown lists wallet names from unarchived wallets (falling back to archived)
- [x] Selecting a wallet copies limits and updates the list
- [x] "Copy From" button hidden after limits are copied or when limits exist
- [x] Current wallet excluded from the "Copy From" dropdown
