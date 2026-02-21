

# Full-Screen Spreadsheet View for All ROs

## What This Does

Adds a new "Spreadsheet" view mode that fills the entire screen with one big table — like Excel — showing every RO and every line item in a flat, scannable grid. You can see RO numbers, job descriptions, labor types, and hours all at once without clicking into individual ROs.

## How It Works

### The View

A single full-width table with these columns:

```text
| RO #  | Date   | Advisor | Line # | Description          | Type | Hours | TBD |
|-------|--------|---------|--------|----------------------|------|-------|-----|
| 1234  | Feb 21 | Mike    | 1      | Brake pad replace    | CP   | 1.5   |     |
| 1234  | Feb 21 | Mike    | 2      | Rotor resurface      | CP   | 0.8   |     |
| 1235  | Feb 21 | John    | 1      | Oil change           | W    | 0.5   |     |
| 1235  | Feb 21 | John    | 2      | Tire rotation        | I    | 0.3   |     |
| 1236  | Feb 20 | Mike    | 1      | Transmission flush   | CP   | 2.0   |     |
```

- RO header fields (RO #, Date, Advisor) are shown on the first line of each RO and visually merged/grayed on subsequent lines of the same RO (like merged cells in Excel)
- Alternating row colors per RO group (not per row) so you can visually distinguish where one RO ends and the next begins
- Sticky header row that stays visible while scrolling
- A summary footer showing total ROs, total lines, and total hours
- The existing date/search filters from the RO list carry over so you can filter the spreadsheet

### Accessing It

- **Desktop**: A toggle button in the top bar (next to the Settings gear) switches between the current split-panel layout and the full-screen spreadsheet. Icon: a grid/table icon.
- **Mobile**: A small toggle at the top of the ROs tab switches between card view and spreadsheet view. The table will be horizontally scrollable on small screens.

### Interactions

- Clicking any row opens that RO in the editor (desktop) or detail sheet (mobile) — same as today
- The table is read-only (no inline editing in this view) to keep it simple and fast
- All existing filters (date range, search, advisor, labor type) work on the spreadsheet data

## Technical Details

### New Files
- `src/components/shared/SpreadsheetView.tsx` — The main table component. Takes filtered ROs as a prop, flattens them into rows (one row per line item), renders using standard HTML table elements styled with Tailwind. Uses sticky `thead`, zebra striping per RO group, and tabular-nums for hours alignment.

### Modified Files
- `src/components/desktop/DesktopWorkspace.tsx` — Add a `viewMode` state (`'split' | 'spreadsheet'`). When `spreadsheet`, render `SpreadsheetView` full-width instead of the split panel. Add a toggle button in the top bar.
- `src/pages/Index.tsx` — Pass a `viewMode` toggle into the mobile layout.
- `src/components/tabs/ROsTab.tsx` — Add a small toggle button near the search bar. When spreadsheet mode is active, render `SpreadsheetView` instead of the card list. Reuse the same `filteredROs` data.

### Key Implementation Notes
- The table flattens each RO's `lines[]` array into individual rows. ROs with no lines get a single row showing the RO header and `workPerformed` as the description.
- RO header cells (RO #, Date, Advisor) use `rowSpan` equal to the number of lines in that RO, creating the merged-cell look.
- Hours column is right-aligned with `tabular-nums` for clean number alignment.
- TBD lines show a small amber badge and their hours are shown with strikethrough.
- The footer sums hours excluding TBD lines, matching existing behavior.
- On mobile, the table wrapper has `overflow-x-auto` so users can swipe horizontally if needed, with the RO # column optionally sticky-left.
