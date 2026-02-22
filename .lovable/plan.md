

# Ensure Large RO Lists Don't Break Views

## Problem
Currently, all views (desktop RO list, mobile card list, spreadsheet view) render every RO at once in the DOM. With hundreds or thousands of ROs, this will cause sluggish scrolling and high memory usage.

## Solution: Progressive Loading + Memoization

### 1. Spreadsheet View (`SpreadsheetView.tsx`)
- Add a `BATCH_SIZE` constant (e.g., 100 rows)
- Only render the first batch of flattened rows initially
- Add a "Show more" row at the bottom that loads the next batch when clicked
- Keep the summary footer accurate (computed from ALL data, not just visible rows) -- this already works since the `useMemo` computes totals from all `ros`

### 2. Desktop RO List (`ROListPanel.tsx`)
- Add a similar progressive render limit (e.g., 50 ROs at a time)
- Show a "Show more" button at the bottom of the list when there are more ROs beyond the limit
- Footer summary stays accurate (already computed from `filteredROs`)

### 3. Mobile Card List (`ROsTab.tsx`)
- Same progressive loading: render first 50 cards, with "Show more" button
- Keeps scroll smooth even with large datasets

### 4. Memoize `ROCard` (mobile)
- Wrap the `ROCard` component in `React.memo` to prevent unnecessary re-renders when sibling cards change

### How "Show More" Works
- A `visibleCount` state starts at the batch size (e.g., 50)
- The rendered list is sliced to `visibleCount`
- Clicking "Show more" increases `visibleCount` by another batch
- Changing filters/search resets `visibleCount` back to the initial batch size

This approach avoids adding new dependencies and works well with the spreadsheet's `rowSpan` layout (which breaks traditional virtualization).

