

# Essential Performance Fixes for Large RO Counts

## What Actually Matters

Only **two** changes are truly necessary to prevent breakage and slowness at 100-1000+ ROs. Everything else (subscription polling interval, review rule optimization, memoizing small arrays) is nice-to-have but won't cause real problems.

## Change 1: Fix the 1,000-Row Silent Data Cap

**Problem**: The database client has a default limit of 1,000 rows per query. If a user has more than 1,000 ROs or 1,000 line items, data silently disappears with no error.

**Fix**: Add `.limit(10000)` to both the `ros` and `ro_lines` queries in `fetchROs` inside `useROStore.ts`. This is a two-line change.

## Change 2: Optimistic Updates After Mutations

**Problem**: After adding or editing a single RO, the app calls `fetchROs()` which re-downloads **every** RO and **every** line item from the database. With 1,000 ROs and 5,000 lines, that's two large network requests after every save -- causing a noticeable delay.

**Fix**: After a successful `addRO`, build the new RO locally and prepend it to state. After a successful `updateRO`, merge the changes into the local copy. Stop calling `fetchROs()` after each mutation. Keep `fetchROs` for initial load and offline sync recovery.

## What We're NOT Changing
- Subscription polling (60s vs 5min) -- not a problem, it's one tiny request
- Review rules O(n^2) -- with progressive loading already capping visible items at 50, this doesn't fire on 1,000 ROs at once
- Memoizing `existingRONumbers` -- minor, not a bottleneck

## Technical Details

### `src/hooks/useROStore.ts`
- **fetchROs**: Add `.limit(10000)` to both queries
- **addRO**: After successful insert + line insert, construct the full RepairOrder object using the existing `dbToRO()` helper and do `setROs(prev => [newRO, ...prev])` instead of `await fetchROs()`
- **updateRO**: After successful update + line replace, re-fetch only that single RO's lines, rebuild it with `dbToRO()`, and do `setROs(prev => prev.map(r => r.id === id ? updatedRO : r))` instead of `await fetchROs()`
- Keep `fetchROs()` calls in: initial mount, offline sync refresh, `clearAllROs`

