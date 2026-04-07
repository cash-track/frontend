# Feature Gap Plans: Old → New Frontend

This directory contains implementation plans for features present in the old Vue 2 codebase (`/frontend/old/`) that are missing from the new Vue 3 + Nuxt UI codebase (`/frontend/src/`).

## Gap Summary

| Plan | Feature | Priority | Complexity | Status |
|------|---------|----------|------------|--------|
| [01](./01-wallets-active-short-list.md) | WalletsActiveShortList — horizontal wallet navigation strip | Medium | Low | ✅ Done |
| [02](./02-wallet-tags-filter-section.md) | WalletView Tags Section — tag-based filtering + per-tag stats + chart stacking | High | High | ⬜ Pending |
| [03](./03-copy-limits-from-wallet.md) | Copy Limits from Another Wallet | Medium | Low | ✅ Done |
| [04](./04-bulk-move-charges.md) | Bulk Move Charges between wallets | Medium | Medium | ⬜ Pending |
| [05](./05-tag-view-chart-and-charges.md) | TagView — ChargesFlowChart + full ChargeItem (edit/delete/expand) | High | Medium | ⬜ Pending |

---

## Recommended Implementation Order

```
Plan 01 (WalletsActiveShortList)   — standalone, no deps
     ↓
Plan 03 (Copy Limits)              — standalone, adds 1 API function
     ↓
Plan 05 Part A (Tag Chart)         — standalone, adds 1 API function
     ↓
Plan 05 Part B (ChargeItem in TagView) — depends on ChargeItem update
     ↓
Plan 02 (WalletView Tags Section)  — depends on ChargesFlowChart (tag-stacking)
     ↓
Plan 04 (Bulk Move)                — depends on ChargeItem (selectable prop)
```

Plans 01, 03, and 05A can be done in any order or in parallel. Plan 02 and 04 have internal dependencies on earlier plans.

---

## API Functions Needed

| Function | File | Status |
|----------|------|--------|
| `getWalletsWithLimits(archived)` | `src/api/wallets.ts` | ✓ Exists |
| `getTagChargesFlow(tagId, params)` | `src/api/graph.ts` | **Missing** |
| `copyLimits(walletId, sourceId)` | `src/api/limits.ts` | ✓ Exists |
| `moveCharges(walletId, targetId, ids)` | `src/api/charges.ts` | ✓ Exists |
| `getWalletTags(walletId)` | `src/api/tags.ts` | ✓ Exists |
| `getChargesFlowByDate(walletId, params)` | `src/api/graph.ts` | ✓ Exists (needs `tags` param wired) |

---

## Notes

- These gaps were identified by comparing every `.vue` file in `/frontend/old/` against `/frontend/src/`
- The MIGRATION.md explicitly noted that tag filtering and TagView chart were deferred — these plans cover those deferrals
- All API endpoints exist in the backend; no backend changes required
- The `WalletTotal.tags` field must be verified to contain per-tag amounts (used by Plan 02)
