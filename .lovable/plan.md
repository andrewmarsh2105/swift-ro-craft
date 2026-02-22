

# Add Skeleton Loading States to the RO List Panel

## Overview

Add shimmer skeleton placeholders to the RO list so that when data is loading from the backend, users see a polished loading state instead of a blank panel or "No ROs found."

## Changes

### 1. ROListPanel -- consume `loadingROs` and show skeletons (`src/components/desktop/ROListPanel.tsx`)

- Import `Skeleton` from `@/components/ui/skeleton`
- Destructure `loadingROs` from `useRO()`
- Before the grouped ROs list, if `loadingROs` is true, render 5-6 skeleton rows that mimic the shape of a real RO row:
  - A skeleton bar for the RO number + status pill area
  - A narrower skeleton bar for the advisor/description line
  - A small skeleton on the right for the hours badge
- Each skeleton row is wrapped in the same padding/border styling as real rows for visual consistency
- Add a skeleton date header above every 3 rows to mimic the date grouping

### 2. Mobile list (optional, low effort) (`src/components/tabs/ROsTab.tsx`)

- Apply the same loading skeleton pattern to the mobile RO list if it also uses `useRO()`

## Technical Details

- `loadingROs` is already returned from `useROStore` and available via `useRO()`
- `Skeleton` component already exists at `src/components/ui/skeleton.tsx`
- No new dependencies or database changes needed

## Files to Modify

| File | Change |
|------|--------|
| `src/components/desktop/ROListPanel.tsx` | Add `loadingROs` destructuring, render skeleton rows when loading |
| `src/components/tabs/ROsTab.tsx` | Same skeleton treatment for mobile list (if applicable) |

