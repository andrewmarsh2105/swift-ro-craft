

# Rework Summary Page and Pay Period Settings

## Overview

Restructure the Summary page into two clean top-level tabs ("Summary" and "Compare") using the Radix Tabs component for a professional look. Add custom pay period dates in Settings so techs can define their own pay cycle (e.g., periods ending on the 15th and 28th).

---

## 1. Summary Page Layout (SummaryTab.tsx)

### Top-Level Tabs: Summary | Compare
Replace the current `SegmentedControl` (which mixes date ranges with the compare feature) with a proper `Tabs` component at the top of the page.

- **Summary tab**: Contains the Total Card, daily breakdown, advisors, labor refs, export buttons
- **Compare tab** (Pro only): Contains the full `MultiPeriodComparison` UI with its own date pickers, chart, table, and labor breakdown

### Date Range Selector Inside Summary Tab
Instead of the `SegmentedControl` for 1 Week / 2 Weeks / Custom, use a compact dropdown (`Select` component) positioned in the header next to the period label. This keeps the UI clean -- one line showing something like:

```
[1 Week v]    Feb 17 - Feb 23
```

The dropdown options:
- 1 Week
- 2 Weeks
- Custom (shows date pickers below)
- Pay Period (only if custom pay dates are configured in Settings -- auto-calculates the current period)

When "Custom" is selected, date pickers appear inline. When "Pay Period" is selected, it auto-calculates the current pay period based on the user's configured end dates.

---

## 2. Settings: Pay Period Range (SettingsTab.tsx)

### Rename Section
Rename "Summary Range" to "Pay Period Range"

### Add Custom Pay Period Option
Add a third option to the existing `SegmentedControl`: `{ value: 'custom', label: 'Custom' }`

When "Custom" is selected, show a UI to configure pay period end dates:
- A list of day-of-month values (e.g., 15, 28)
- An "Add date" button to add a new end date
- Each date has a delete button
- These dates define when pay periods end (e.g., the 15th and 28th means periods run 16th-28th and 29th-15th)

### Database Changes
Add two columns to `user_settings`:
- `pay_period_type` (text, default `'week'`) -- values: `'week'`, `'two_weeks'`, `'custom'`
- `pay_period_end_dates` (integer array, default `null`) -- e.g., `[15, 28]`

### Hook Changes (useUserSettings.ts)
- Add `payPeriodType` and `payPeriodEndDates` to the `UserSettings` interface
- Map to/from DB column names in fetch/update logic

---

## 3. Pay Period Auto-Calculation

### New Utility: `getCustomPayPeriodRange(endDates: number[], referenceDate: Date)`
Given an array of end dates (e.g., `[15, 28]`) and today's date, calculate which period we're currently in:
- Sort the end dates
- Find the current period's start and end based on where today falls
- Handle month boundaries (e.g., period ending on 15th starts on 29th of previous month)

This will be added as a helper in `SummaryTab.tsx` or a shared utility.

---

## 4. Files to Change

| File | Changes |
|------|---------|
| `src/components/tabs/SummaryTab.tsx` | Replace SegmentedControl with Tabs (Summary / Compare). Add Select dropdown for date range inside Summary tab. Add pay period auto-calc. |
| `src/components/tabs/SettingsTab.tsx` | Rename "Summary Range" to "Pay Period Range". Add Custom option with end-date picker UI. |
| `src/hooks/useUserSettings.ts` | Add `payPeriodType` and `payPeriodEndDates` fields. |
| Database migration | Add `pay_period_type` and `pay_period_end_dates` columns to `user_settings`. |

---

## 5. Visual Structure

### Summary Page - Summary Tab
```text
+----------------------------------+
|  [ Summary ]  [ Compare ]       |  <-- Tabs (top)
+----------------------------------+
|  [1 Week v]   Feb 17 - Feb 23   |  <-- Select + date label
+----------------------------------+
|  +--------------------------+    |
|  |   WEEK TOTAL             |    |  <-- Total Card (primary)
|  |   33.0h                  |    |
|  |   16 ROs . 58 lines      |    |
|  |   W: 1.4h  CP: 31.6h     |    |
|  +--------------------------+    |
|                                  |
|  Daily Breakdown                 |
|  [day cards...]                  |
|                                  |
|  By Advisor                      |
|  [advisor cards...]              |
|                                  |
|  By Labor Reference              |
|  [ref cards...]                  |
|                                  |
|  [Proof Pack]                    |
|  [Copy Summary] [Export CSV]     |
+----------------------------------+
```

### Summary Page - Compare Tab
```text
+----------------------------------+
|  [ Summary ]  [ Compare ]       |
+----------------------------------+
|  Period A: [Start] - [End]       |
|  Period B: [Start] - [End]       |
+----------------------------------+
|  [Period A] [Delta] [Period B]   |  <-- Summary cards
|  [Bar Chart]                     |
|  [Daily Table with deltas]       |
|  [Labor Type Breakdown]          |
+----------------------------------+
```

---

## Technical Notes

- The Tabs component from Radix (`@radix-ui/react-tabs`) is already installed and available at `src/components/ui/tabs.tsx`
- The Select component is available at `src/components/ui/select.tsx`
- The Compare tab will be wrapped in a Pro gate -- non-Pro users see an upgrade prompt
- The `defaultSummaryRange` user setting will be replaced by `payPeriodType` for the default selection
- Backward compatibility: existing `week`/`two_weeks` values in `default_summary_range` will continue to work as fallback

