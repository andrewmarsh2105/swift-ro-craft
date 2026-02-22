

# Fix: Period B Hours Missing from Daily Table and Chart

## Root Cause

A timezone bug in `usePayPeriodReport.ts` at line 94-97. When building the day-by-day map:

```
const start = new Date("2025-02-09");  // Parsed as UTC midnight
d.getDate()                             // Returns LOCAL date = Feb 8 in US timezones
```

The dayMap ends up with shifted date keys (e.g., "2025-02-08" instead of "2025-02-09"). When RO dates (stored as correct local strings like "2025-02-09") are looked up via `dayMap.get(effectiveDate)`, they don't match, so hours silently stay at 0.

The total hours in the summary cards work correctly because they're calculated directly from the filtered lines array, bypassing the dayMap entirely.

This bug affects BOTH periods, but can appear to work for one period if its RO dates happen to coincide with the shifted keys.

## Fix

**File: `src/hooks/usePayPeriodReport.ts`** (lines 94-95)

Change:
```
const start = new Date(startDate);
const end = new Date(endDate);
```

To:
```
const start = new Date(startDate + 'T12:00:00');
const end = new Date(endDate + 'T12:00:00');
```

Appending `T12:00:00` forces local-time parsing (noon), eliminating the UTC midnight shift. This is the same pattern already used elsewhere in `SummaryTab.tsx` (e.g., line 45: `new Date(summary.date + 'T12:00:00')`).

That's it -- a two-character-level fix on two lines. No other files need changes.

