

# Enhanced Spreadsheet View -- Better RO Identification and Visual Appeal

## Problems to Solve

Right now the spreadsheet is a flat wall of text rows with only subtle zebra striping to separate RO groups. It's hard to quickly scan and identify where one RO ends and the next begins, especially with multi-line ROs.

## Visual Improvements

### 1. Date Group Headers (Day Separators)
Insert bold section rows that break the table into days, like:
```text
--- Fri, Feb 21 ---- (3 ROs, 8.5h) ---
  #1234  Mike   1  Brake pad replace     CP  1.5   2.3h
  #1234  Mike   2  Rotor resurface       CP  0.8
  #1235  John   1  Oil change            W   0.5   0.5h
--- Thu, Feb 20 ---- (2 ROs, 4.0h) ---
  #1236  Mike   1  Transmission flush    CP  2.0   2.0h
```
Each day header spans all columns and shows the day's RO count and total hours at a glance.

### 2. Stronger RO Group Borders
Replace the subtle zebra striping with a thicker top border on the first row of each RO group. This creates a clear visual "break" between ROs without relying only on background color.

### 3. Color-Coded Left Border per Labor Type
Add a 3px left border on the RO # cell that matches the labor type color (green for Warranty, blue for Customer Pay, orange for Internal). This gives an instant visual cue for the dominant type without reading text.

### 4. Vehicle Info Column
Add a "Vehicle" column after Advisor showing the compact vehicle chip (e.g. "'25 Altima"). This is key information techs use to identify an RO at a glance, and it's currently missing from the spreadsheet.

### 5. Improved Summary Footer
Upgrade the footer to show a breakdown by labor type (e.g. "12.5h total -- W: 4.0h | CP: 6.5h | I: 2.0h") so techs can see their mix at a glance.

### 6. Highlighted RO Total Column
Give the RO Total column a subtle primary background tint so the per-RO totals visually "pop" from the rest of the numbers.

## Technical Details

### Modified File: `src/components/shared/SpreadsheetView.tsx`

- **Date grouping**: Sort rows by date descending, then insert "separator" rows into the flat array. These render as full-width `<tr>` with `colSpan` across all columns.
- **Left border**: On the first row of each RO group, apply a `border-l-3` with the labor type color to the RO # cell.
- **Thicker group border**: The first row of each RO gets `border-t-2 border-border` instead of the thin `border-b border-border/50`.
- **Vehicle column**: New `<th>` and `<td>` using `formatVehicleChip()` from `src/types/ro.ts`, merged with `rowSpan` like RO #, Date, and Advisor.
- **Footer breakdown**: Compute warranty/CP/internal hour totals in the existing `useMemo` and render them in the footer with colored labels.
- **RO Total highlight**: Add a subtle `bg-primary/5` class to the RO Total header and data cells.

### No other files need changes
The spreadsheet already receives filtered ROs from both desktop and mobile, so the filter-respecting behavior stays the same.

