
# Pro Subscription System with Feature Gating

## Overview
Implement a Stripe-powered Pro subscription with two gated features: **RO cap** (free users limited to 150 ROs/month) and **multi-period reporting** in the Summary tab. OCR scanning and scan templates also gated (per existing memory). Proof Pack, CSV, and copy summary remain free. Spreadsheet view with print is Pro-only. Premium features are hidden (not crossed out) for free users, with subtle upgrade prompts.

## Pricing
- **Free**: Core RO tracking, manual entry, flags, basic summary (1-week/2-week/custom), Proof Pack, CSV export, copy summary
- **Pro ($9.99/month)**: Unlimited ROs, OCR scan, scan templates, spreadsheet view with print, multi-period reporting (side-by-side comparison)

Using existing Stripe product `prod_TytAJ1A0OZTgh0` and price `price_1T0vODQViI7PZv2K8M9McWMn`.

## What Gets Gated

| Feature | Free | Pro |
|---------|------|-----|
| RO creation | 150/month | Unlimited |
| Manual line entry | Yes | Yes |
| Flag inbox | Yes | Yes |
| Summary (1wk/2wk/custom) | Yes | Yes |
| Proof Pack + CSV export | Yes | Yes |
| OCR scan (photo capture) | Hidden | Yes |
| Scan templates | Hidden | Yes |
| Spreadsheet view + print | Hidden | Yes |
| Multi-period reporting | Hidden | Yes |

## Multi-Period Reporting (New Feature)
A new section in the Summary tab (Pro only) that lets users select two date ranges and see them side-by-side for comparison -- e.g., this pay period vs. last pay period. Shows totals, labor type breakdowns, and delta/change indicators.

## UX Approach -- Subtle but Visible
- Gated features are **completely hidden** from the UI (not shown as disabled/locked)
- A small, tasteful "Upgrade to Pro" card appears in Settings with a brief feature list
- A subtle "Pro" badge appears in the top bar (desktop) or settings (mobile) when on the free plan, tapping opens the upgrade screen
- When free users hit the 150 RO/month cap, a friendly bottom sheet explains the limit and offers upgrade
- No banners, no pop-ups on load, no aggressive upselling

## Technical Details

### 1. Edge Functions (3 new)

**`check-subscription`** -- Checks if authenticated user has an active Stripe subscription. Returns `{ subscribed, product_id, subscription_end }`. Called on auth state change and periodically.

**`create-checkout`** -- Creates a Stripe checkout session for the Pro plan. Returns `{ url }` for redirect.

**`customer-portal`** -- Creates a Stripe billing portal session for subscription management. Returns `{ url }`.

### 2. Subscription Context (`src/contexts/SubscriptionContext.tsx`)
- Wraps the app, provides `{ isPro, loading, subscriptionEnd, checkSubscription }`
- Calls `check-subscription` on mount and every 60 seconds
- Re-checks on auth state changes
- Exposes helper: `isPro` boolean for gating

### 3. RO Cap Logic
- Count ROs created in the current calendar month (filter by `created_at`)
- In `useROStore.addRO`, check if free user has reached 150 ROs this month
- If capped, show a friendly bottom sheet instead of creating the RO
- Pro users bypass the check entirely

### 4. UI Changes

**Settings tab:**
- Add a "Plan" settings group near the top showing current plan status
- Free users see a card: "Upgrade to Pro -- Unlock OCR scanning, spreadsheet view, unlimited ROs, and more" with a subtle upgrade button
- Pro users see "Pro Plan" with subscription end date and "Manage Subscription" button
- Hide "Scan Templates" section for free users

**Summary tab:**
- Hide the multi-period comparison section for free users (not rendered at all)
- Multi-period section appears below existing content for Pro users

**Desktop workspace (top bar):**
- Hide the spreadsheet view toggle button for free users
- Subtle "Pro" text badge near settings icon for free users (clickable, opens upgrade)

**Mobile (Index/bottom bar):**
- No scan FAB for free users (already hidden since OCR is gated)
- No visual changes to bottom bar

**AddRO / ROEditor:**
- Hide the scan/photo button for free users
- Show RO cap bottom sheet when limit reached

### 5. Database
- No new tables needed -- subscription status is checked live from Stripe via edge function
- RO count for cap uses existing `ros` table filtered by `created_at` in current month

### 6. Config Updates
- `supabase/config.toml`: Add entries for the 3 new edge functions with `verify_jwt = false`

### 7. Files to Create
- `supabase/functions/check-subscription/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/customer-portal/index.ts`
- `src/contexts/SubscriptionContext.tsx`

### 8. Files to Modify
- `src/App.tsx` -- Wrap with SubscriptionProvider
- `src/contexts/AuthContext.tsx` -- No changes needed (subscription context handles its own checks)
- `src/components/tabs/SettingsTab.tsx` -- Add Plan section, hide templates for free
- `src/components/tabs/SummaryTab.tsx` -- Add multi-period comparison (Pro only)
- `src/components/desktop/DesktopWorkspace.tsx` -- Hide spreadsheet toggle, add Pro badge
- `src/components/scan/ScanFlow.tsx` -- No changes (parent hides the button)
- `src/pages/AddRO.tsx` -- Hide scan button for free users
- `src/components/desktop/ROEditor.tsx` -- Hide scan button for free users
- `src/hooks/useROStore.ts` -- Add RO cap check in addRO
- `supabase/config.toml` -- Add function entries
- `src/pages/Index.tsx` -- Conditionally hide scan-related FAB
