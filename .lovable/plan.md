
## Tie "Week" Filter to Default Period Setting + Fix Week Start Day in Summary

### What the User Wants

1. **Main page "Week" filter** (mobile ROs tab + desktop list panel): When the user has set their default period to "2 Weeks" in Settings, clicking "Week" in the date filter should show the last 2 weeks (from 2 week-starts ago to today). If set to "1 Week", show the current week only.

2. **Summary tab**: Should still open on the default period (already done). No change needed there — `defaultSummaryRange` already controls what the Summary tab opens on.

3. **Week start day must not break**: The `weekStartDay` preference must continue to anchor both the 1-week and 2-week calculations correctly.

---

### Current Behavior

- `ROsTab.tsx` (mobile) and `ROListPanel.tsx` (desktop) — the "Week" date filter always calls `getWeekStart(weekStartDay)` to find the most recent occurrence of the start day and shows from there to today. It always shows exactly 1 week regardless of the default period setting.
- `SummaryTab.tsx` — `getWeekRange()` has its own hardcoded logic (uses Monday, not `weekStartDay`). This is a separate issue but worth noting — the Summary tab's "1 Week" segment should also use `weekStartDay`. However, the user hasn't asked to change Summary tab logic here, so we'll focus only on the filter changes.

---

### Where the Changes Go

**2 files only** — no database or schema changes needed:

#### 1. `src/components/tabs/ROsTab.tsx`

The `getWeekStart` function already exists and works correctly. We need to add a `getTwoWeekStart` function that goes back an additional full week:

```typescript
function getTwoWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff - 7); // go back one extra week
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}
```

Then update the `week` date filter branch to check `userSettings.defaultSummaryRange`:

```typescript
} else if (filters.dateRange === 'week') {
  const useTwoWeeks = userSettings.defaultSummaryRange === 'two_weeks';
  const weekStart = useTwoWeeks
    ? getTwoWeekStart(userSettings.weekStartDay ?? 0)
    : getWeekStart(userSettings.weekStartDay ?? 0);
  result = result.filter((ro) => ro.date >= weekStart);
}
```

Also update the label for the "Week" filter button in the bottom sheet so users understand what they'll see:

The `SegmentedControl` option label for `week` will dynamically say **"1 Week"** or **"2 Weeks"** based on the setting:

```typescript
{ value: 'week', label: userSettings.defaultSummaryRange === 'two_weeks' ? '2 Weeks' : '1 Week' }
```

This way users see exactly what the filter will show.

#### 2. `src/components/desktop/ROListPanel.tsx`

Same changes as above — add `getTwoWeekStart`, update the `week` branch of the date filter, and update the filter tab label. The desktop panel uses `dateFilter` state and a tab-style UI rather than a bottom sheet.

---

### How the Math Works (Week Start Day Preserved)

**1 Week mode** (existing, unchanged):
- Find the most recent occurrence of `weekStartDay`
- e.g. weekStartDay = Monday (1), today = Thursday → weekStart = this past Monday

**2 Week mode** (new):
- Find the most recent occurrence of `weekStartDay`, then go back 7 more days
- e.g. weekStartDay = Monday (1), today = Thursday → weekStart = the Monday before last
- Result: shows 2 full weeks anchored to the configured start day

**Edge cases**:
- Today IS the start day → 1-week mode shows only today; 2-week mode shows today + the full previous week
- All consistent with the Summary tab's biweekly logic which also uses 2 stacked calendar weeks

---

### What Stays the Same

- `defaultSummaryRange` setting UI in Settings tab — no changes
- `weekStartDay` picker UI in Settings tab — no changes
- Summary tab range selector — no changes
- "Today" and "Month" filters — no changes
- All other filter logic (advisors, labor type, search) — no changes
- No database migration needed

---

### Summary of Files Changed

| File | Change |
|---|---|
| `src/components/tabs/ROsTab.tsx` | Add `getTwoWeekStart`, update week filter logic + dynamic label |
| `src/components/desktop/ROListPanel.tsx` | Add `getTwoWeekStart`, update week filter logic + dynamic label |
