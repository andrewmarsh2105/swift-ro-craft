

## Add Yearly Plan at $79.99/year + Fix Monthly Price to $8.99

### What's changing
- Create **two new Stripe prices**: monthly at $8.99 and yearly at $79.99 on the existing Pro product
- Update the **Pro Upgrade Dialog** to let users pick between Monthly and Yearly billing (with a savings badge showing ~26% savings)
- Update the **checkout backend function** to accept a `plan` parameter (`monthly` or `yearly`) and use the correct price
- Update the **Subscription Context** to pass the selected plan to the checkout function

### Steps

1. **Create two new Stripe prices**
   - Monthly: $8.99/month (899 cents, recurring monthly) on `prod_TytAJ1A0OZTgh0`
   - Yearly: $79.99/year (7999 cents, recurring yearly) on `prod_TytAJ1A0OZTgh0`

2. **Update `supabase/functions/create-checkout/index.ts`**
   - Accept a `plan` field from the request body (`"monthly"` or `"yearly"`)
   - Map to the correct new price ID
   - Default to monthly if not specified

3. **Update `src/contexts/SubscriptionContext.tsx`**
   - Modify `startCheckout` to accept an optional `plan` parameter and pass it in the edge function body

4. **Update `src/components/ProUpgradeDialog.tsx`**
   - Add a toggle/segmented control to switch between Monthly ($8.99/mo) and Yearly ($79.99/yr)
   - Show a savings indicator on the yearly option (e.g., "Save 26%")
   - Pass the selected plan to `startCheckout`
   - Update the CTA button text to reflect the selected plan

### Technical details

**Edge function change** (`create-checkout/index.ts`):
- Parse `plan` from request JSON body
- Map prices: `{ monthly: "price_NEW_MONTHLY_ID", yearly: "price_NEW_YEARLY_ID" }`
- Use the mapped price in `line_items`

**SubscriptionContext change**:
- `startCheckout` signature becomes `(plan?: 'monthly' | 'yearly') => Promise<void>`
- Passes `{ plan: plan || 'monthly' }` as the body to `supabase.functions.invoke`

**ProUpgradeDialog UI change**:
- Add state for `selectedPlan` (`'monthly' | 'yearly'`)
- Two plan cards or a toggle at the top of the CTA area
- Monthly card: "$8.99/mo"
- Yearly card: "$79.99/yr" with a "Save 26%" badge
- CTA button updates dynamically: "Subscribe -- $8.99/month" or "Subscribe -- $79.99/year"

