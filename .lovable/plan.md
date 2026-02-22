

# Fix: Advisors Reappearing After Deletion

## Root Cause

The advisor list is **not stored in the database**. Instead, it is re-derived from existing Repair Orders every time the RO list changes (via a `useEffect` in `useROStore.ts`). This means:

1. You delete an advisor in Settings -- it updates local state
2. Any state change that touches `ros` triggers the `useEffect`
3. The `useEffect` rebuilds the advisor list from all ROs, bringing back deleted advisors
4. The `updateAdvisors` function only sets local state with no database persistence

## Solution

Create an `advisors` database table so advisors are persisted independently of ROs. Then update the store to fetch/save advisors from the database instead of deriving them from RO data.

### Step 1: Create `advisors` table

Create a new database table:

```text
advisors
  - id (uuid, primary key)
  - user_id (uuid, not null)
  - name (text, not null)
  - created_at (timestamptz, default now())

Unique constraint on (user_id, lower(name))
RLS policies for select/insert/update/delete owned rows
```

### Step 2: Seed existing advisors

Run a one-time migration that populates the new `advisors` table from distinct `advisor_name` values currently in the `ros` table, so no data is lost.

### Step 3: Update `useROStore.ts`

- **Remove** the `useEffect` that derives advisors from ROs (lines 162-174)
- **Add** a `fetchAdvisors` function that queries the `advisors` table
- **Update** `updateAdvisors` to persist changes to the database (insert/delete rows)
- Call `fetchAdvisors` on mount alongside `fetchROs` and `fetchPresets`

### Step 4: Update `SettingsTab.tsx`

- `deleteAdvisor` will call `updateAdvisors` which now persists to the database
- `saveAdvisor` (add/edit) will also persist via the updated function
- No major UI changes needed -- the same list and edit/delete buttons work

### Step 5: Update `AdvisorCombobox` "Add new advisor"

When creating a new advisor from the RO editor combobox, also insert into the `advisors` table so it persists.

### Step 6: Update offline queue

Add `addAdvisor` and `deleteAdvisor` action types to the offline queue so advisor changes sync when reconnecting.

## Files to Change

| File | Changes |
|------|---------|
| New migration | Create `advisors` table with RLS, seed from existing RO data |
| `src/hooks/useROStore.ts` | Remove derive-from-ROs effect, add `fetchAdvisors`, persist `updateAdvisors` to DB |
| `src/components/tabs/SettingsTab.tsx` | Wire up delete/save to the new persistent `updateAdvisors` |
| `src/components/desktop/AdvisorCombobox.tsx` | Ensure "Add new advisor" also persists to DB via the store |
| `src/lib/offlineQueue.ts` | Add advisor action types |
| `src/hooks/useOfflineSync.ts` | Handle advisor sync actions |

