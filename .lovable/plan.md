

# Elevate Pay Period Comparison

## Current State
The period comparison is hidden at the bottom of the summary page, below export buttons. It only shows total hours and labor type deltas -- no daily breakdown, no charts.

## What Changes

### 1. Move Comparison Up and Make It Prominent
- Move the `MultiPeriodComparison` section from the bottom of the page to directly below the "Total Card" (the big primary-colored hero card)
- This puts it front-and-center as the second thing users see

### 2. Add Daily Breakdown Table
When both periods are selected, show a day-by-day comparison:
- Each row = a day (Mon, Tue, Wed, etc.)
- Columns: Day name | Period A hours | Period B hours | Delta
- Delta column is color-coded: green for positive, red for negative
- A "Total" row at the bottom with the grand totals and overall delta

### 3. Add a Bar Chart Visualization
Using the already-installed `recharts` library:
- Grouped bar chart showing Period A vs Period B hours per day
- Period A bars in blue/primary color, Period B bars in a secondary color (e.g., violet/purple)
- X-axis = day labels (Mon, Tue, etc.)
- Clean, readable, with a legend

### 4. Enhanced Summary Cards
Replace the current simple 3-column grid with more visually distinct cards:
- Period A and Period B each get their own card with labor type pills
- The delta indicator gets a larger, more prominent display with a colored background pill (green bg for positive, red bg for negative)

### 5. Date Handling
The `usePayPeriodReport` hook already uses `ro.paidDate || ro.date` for all grouping -- no changes needed there. The comparison dates are converted using `toISOString().split('T')[0]` which will be changed to use the `localDateStr` utility for timezone safety.

## Technical Details

### File: `src/components/tabs/SummaryTab.tsx`

**Move placement**: The `MultiPeriodComparison` JSX block moves from after the export buttons (line 499) to right after the Total Card (after line 408), still wrapped in `isPro &&`.

**Rewrite `MultiPeriodComparison` component** to include:
- Fix date formatting to use `localDateStr` instead of `toISOString().split('T')[0]`
- Keep the date pickers (Period A / Period B) as-is
- Add a `BarChart` from recharts showing daily hours for both periods side by side
- Add a daily breakdown table below the chart with color-coded delta column
- Enhanced total comparison cards with colored delta pill
- The daily data comes from `report1.byDay` and `report2.byDay`, aligned by day-of-week

**Chart specifics**:
- `BarChart` with `Bar` components for Period A and Period B
- Colors: Period A = primary/blue (`hsl(var(--primary))`), Period B = violet/purple (`#8b5cf6`)
- `XAxis` with day abbreviations, `YAxis` with hours
- `Tooltip` showing exact values
- `Legend` at top
- Wrapped in a `ResponsiveContainer` for proper sizing

**Daily table specifics**:
- Uses existing `Table` UI components
- Rows for each day in the range (aligned by weekday)
- Delta cell: green text + background tint for positive, red for negative, muted for zero
- Bold total row at bottom

