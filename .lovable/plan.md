

# Stripe Integration and Feature Paywall Plan

## Overview

Connect Stripe to the app and create a subscription system that locks premium features behind a paid tier. Free users get core RO tracking; paying subscribers unlock advanced features like OCR scanning, reports/exports, and templates.

## Step 1: Enable Stripe

- Use the Stripe integration tool to connect your Stripe account
- You will need your Stripe secret key (starts with `sk_test_` or `sk_live_`) from the Stripe Dashboard (https://dashboard.stripe.com/apikeys)

## Step 2: Create Subscription Products in Stripe

- Create a "Pro" product with a monthly price (e.g., $9.99/month)
- Optionally add a "Free" tier for reference

## Step 3: Database Changes

Add a `subscriptions` table to track user subscription status:

- `id` (uuid, primary key)
- `user_id` (uuid, not null)
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `status` (text -- active, canceled, past_due, etc.)
- `plan` (text -- free, pro)
- `current_period_end` (timestamptz)
- `created_at`, `updated_at`

RLS policies: users can only read their own subscription row.

## Step 4: Backend Functions (Edge Functions)

1. **`create-checkout`** -- Creates a Stripe Checkout Session for the user to subscribe
2. **`stripe-webhook`** -- Receives Stripe webhook events (checkout.session.completed, invoice.paid, customer.subscription.updated/deleted) and updates the `subscriptions` table
3. **`create-portal`** -- Creates a Stripe Customer Portal session so users can manage billing

## Step 5: Frontend -- Subscription Hook

Create a `useSubscription` hook that:
- Fetches the user's subscription status from the `subscriptions` table
- Exposes `isPro`, `plan`, `status`, and `currentPeriodEnd`
- Caches with React Query for performance

## Step 6: Feature Gating

Lock these features behind the Pro plan:

| Feature | Free | Pro |
|---------|------|-----|
| Create/edit ROs | Yes | Yes |
| Manual line entry | Yes | Yes |
| OCR scan (photo capture) | No | Yes |
| Proof Pack / CSV export | No | Yes |
| Templates (create/manage) | No | Yes |
| Flag inbox | Yes | Yes |
| Summary tab (basic) | Yes | Yes |
| Summary tab (full reports) | No | Yes |

When a free user taps a locked feature, show an upgrade prompt with a button that opens the Stripe Checkout page.

## Step 7: Settings -- Subscription Management

Add a "Subscription" section to the Settings tab showing:
- Current plan (Free / Pro)
- If Pro: renewal date, "Manage Billing" button (opens Stripe Portal)
- If Free: "Upgrade to Pro" button (opens Stripe Checkout)

## Technical Details

### Edge Function: `create-checkout`
- Accepts user email and a `priceId`
- Creates or retrieves a Stripe customer
- Creates a Checkout Session with `success_url` and `cancel_url`
- Returns the checkout URL

### Edge Function: `stripe-webhook`
- Verifies Stripe webhook signature
- Handles events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
- Upserts the `subscriptions` table accordingly

### Edge Function: `create-portal`
- Looks up the user's `stripe_customer_id`
- Creates a Billing Portal session
- Returns the portal URL

### Frontend Gating Pattern
```text
function PremiumFeature({ children }) {
  const { isPro } = useSubscription();
  if (!isPro) return <UpgradePrompt />;
  return children;
}
```

Applied to: ScanFlow trigger, ProofPack export, Template management

## Implementation Order

1. Enable Stripe (tool call)
2. Create database table + RLS
3. Build edge functions (checkout, webhook, portal)
4. Create `useSubscription` hook
5. Add upgrade UI and gate features
6. Add subscription management to Settings

