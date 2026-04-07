# Gap Plan 01: WalletsActiveShortList Component

## What's Missing

The old codebase had `WalletsActiveShortList.vue` — a horizontally scrollable strip of active wallets shown at the top of several pages. It provides quick navigation between wallets without leaving the current view.

**Was used in (old app):**
- `WalletCreateView.vue` — top of wallet creation page
- `WalletView.vue` — top of wallet detail page
- `TagView.vue` — top of tag stats page

**New codebase:** No equivalent exists. The new `WalletCreateView` and `TagView` render their content without this navigation strip.

---

## Behaviour (from old app)

- Reads active wallets from the Pinia store (`walletsStore.activeWallets`, filtered to `isActive === true`)
- Renders as a single horizontal scrollable row
- Each item shows wallet name (truncated at ~250px) + balance (formatted with money formatter)
- Click navigates to `wallets.show` route for that wallet
- Hidden entirely when there are no active wallets
- Right edge has a white gradient fade (50px) to signal that the list is scrollable

---

## Files to Create / Modify

### New file: `src/components/wallets/WalletsActiveShortList.vue`

**Implementation:**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletsStore } from '@/stores/wallets'
import { useMoneyFormatter } from '@/composables/useMoneyFormatter'
import type { Wallet } from '@/api/models/wallet'

const router = useRouter()
const walletsStore = useWalletsStore()
const { format } = useMoneyFormatter()

const wallets = computed(() =>
    walletsStore.activeWallets.filter((w: Wallet) => w.isActive)
)

function navigate(wallet: Wallet) {
    router.push({ name: 'wallets.show', params: { walletID: wallet.id.toString() } })
}
</script>

<template>
    <div v-if="wallets.length" class="relative overflow-hidden mb-4">
        <!-- Right fade gradient -->
        <div class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-default to-transparent z-10 pointer-events-none" />
        <!-- Scrollable row -->
        <div class="flex gap-0 overflow-x-auto scrollbar-none pr-12">
            <button
                v-for="wallet in wallets"
                :key="wallet.id"
                class="flex-none flex items-center gap-3 px-4 py-2 border border-default bg-elevated hover:bg-accented text-sm whitespace-nowrap first:rounded-l-lg last:rounded-r-lg"
                @click="navigate(wallet)"
            >
                <span class="max-w-[200px] truncate font-medium">{{ wallet.name }}</span>
                <span class="text-primary font-semibold">
                    {{ wallet.defaultCurrency ? format(wallet.totalAmount, wallet.defaultCurrency) : wallet.totalAmount }}
                </span>
            </button>
        </div>
    </div>
</template>
```

> **Note:** Adjust Tailwind classes to match the app's color token conventions (`bg-default`, `bg-elevated`, `bg-accented`, `text-primary`). Use `UButton` group if preferred for consistency.

---

### Modified: `src/views/WalletCreateView.vue`

Add `WalletsActiveShortList` above the form:

```vue
<template>
    <div>
        <WalletsActiveShortList />
        <div class="max-w-2xl mx-auto">
            <WalletCreate />
        </div>
    </div>
</template>
```

### Modified: `src/views/TagView.vue`

Add `WalletsActiveShortList` at the top of the page:

```vue
<template>
    <div class="space-y-6">
        <WalletsActiveShortList />
        <!-- ... rest of existing template ... -->
    </div>
</template>
```

### Modified: `src/views/WalletView.vue`

The old WalletView also had `WalletsActiveShortList` at the top. Decide whether to add it here too (consistent with old UX) or keep it out (WalletView already shows the current wallet context clearly).

**Recommendation:** Add it — the old app used it on WalletView to enable quick switching between wallets while viewing charges.

---

## API Requirements

None. Reads from existing `walletsStore.activeWallets` which is already populated.

---

## Store Requirements

Uses `useWalletsStore()`. Ensure `activeWallets` is populated before this component renders (the store loads wallets on app init via `App.vue`).

---

## Testing

- Wallets store has active wallets → strip renders with correct names and balances
- Wallets store is empty → strip is hidden
- Click on an item → router navigates to `wallets.show` with correct `walletID`
- Long wallet name → truncated, does not overflow
- Many wallets → horizontal scroll works; gradient fade visible on right

---

## Acceptance Criteria

- [x] `WalletsActiveShortList.vue` component created
- [x] Used in `WalletCreateView.vue` at the top
- [x] Used in `TagView.vue` at the top
- [x] Used in `WalletView.vue` at the top
- [x] Right gradient fade present (inline style — Tailwind v4 `from-[--ui-bg]` does not resolve CSS vars)
- [x] Horizontal scroll works on mobile
- [x] Hidden when no active wallets
