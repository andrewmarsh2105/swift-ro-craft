import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const DEFAULT_PRO_PRODUCT_IDS = ["prod_TytAJ1A0OZTgh0", "prod_U2nOsuL3zAYIwa", "prod_U2ndu4y9M2upB3"];
const ENV_PRODUCT_IDS = (Deno.env.get("STRIPE_PRO_PRODUCT_IDS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const PRO_PRODUCT_IDS = ENV_PRODUCT_IDS.length > 0 ? ENV_PRODUCT_IDS : DEFAULT_PRO_PRODUCT_IDS;

const ACCESS_GRANTING_STATUSES = new Set(["active", "trialing"]);

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

function isProSubscription(subscription: any): boolean {
  return subscription?.items?.data?.some((item: any) => {
    const product = String(item?.price?.product || "");
    return PRO_PRODUCT_IDS.includes(product);
  }) === true;
}

async function findUserIdByCustomerId(supabaseAdmin: any, customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;

  const { data: settingsRows } = await supabaseAdmin
    .from("user_settings")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .limit(1);

  if (!settingsRows || settingsRows.length === 0) return null;
  return settingsRows[0].user_id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  if (!webhookSecret) {
    logStep("REJECTED: STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const body = await req.text();
  let event: Stripe.Event;

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature header", { status: 400 });
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: String(err) });
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const { error: claimError } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ stripe_event_id: event.id, stripe_event_type: event.type });

  if (claimError) {
    const code = (claimError as any)?.code || "";
    if (code === "23505") {
      logStep("Duplicate event skipped", { id: event.id, type: event.type });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    logStep("Failed to claim event", { id: event.id, error: claimError.message });
    return new Response(JSON.stringify({ error: "Could not record webhook event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const supabaseUserId = session.client_reference_id || session.metadata?.supabase_user_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        logStep("checkout.session.completed", { supabaseUserId, customerId, subscriptionId });

        if (supabaseUserId && customerId) {
          await supabaseAdmin
            .from("user_settings")
            .upsert({
              user_id: supabaseUserId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            }, { onConflict: "user_id" });
          logStep("Updated user_settings identifiers after checkout", { supabaseUserId });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const status = subscription.status;
        const metadataUserId = subscription.metadata?.supabase_user_id;
        const isProProduct = isProSubscription(subscription);

        logStep("subscription event", {
          eventType: event.type,
          customerId,
          status,
          metadataUserId,
          subId: subscription.id,
          isProProduct,
        });

        if (!isProProduct) {
          logStep("Ignoring non-Pro subscription", { subId: subscription.id, status });
          break;
        }

        const supabaseUserId = metadataUserId || await findUserIdByCustomerId(supabaseAdmin, customerId);
        if (!supabaseUserId) {
          logStep("No user found for subscription event", { customerId, subId: subscription.id });
          break;
        }

        const isActive = ACCESS_GRANTING_STATUSES.has(String(status));
        let subscriptionEnd: string | null = null;
        try {
          if (subscription.current_period_end && typeof subscription.current_period_end === "number") {
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
        } catch { /* non-fatal */ }

        await supabaseAdmin
          .from("user_settings")
          .upsert({
            user_id: supabaseUserId,
            stripe_customer_id: customerId,
            stripe_subscription_id: event.type === "customer.subscription.deleted" ? null : subscription.id,
            is_pro: isActive,
            plan: isActive ? (status === "trialing" ? "trial" : "pro") : null,
            pro_expires_at: isActive ? subscriptionEnd : null,
          }, { onConflict: "user_id" });

        logStep("Updated user_settings from subscription event", {
          supabaseUserId,
          status,
          isActive,
          subscriptionEnd,
        });
        break;
      }

      case "invoice.payment_failed":
      case "invoice.paid": {
        const invoice = event.data.object as any;
        logStep("invoice event received", {
          type: event.type,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          billingReason: invoice.billing_reason,
        });
        // Access updates are handled by customer.subscription.updated from Stripe.
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric" })
          : "soon";

        logStep("trial_will_end", { customerId, trialEnd });

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) break;

        // Look up user email
        const { data: settingsRows } = await supabaseAdmin
          .from("user_settings")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .limit(1);

        if (!settingsRows || settingsRows.length === 0) break;

        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(settingsRows[0].user_id);
        const userEmail = userData?.user?.email;
        if (!userEmail) break;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "RO Navigator <noreply@ronavigator.com>",
            to: [userEmail],
            subject: "Your Pro trial ends soon",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #111;">
                <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">Your free trial ends on ${trialEnd}</h1>
                <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                  Your 7-day Pro trial is almost up. Here's what you'll keep with a Pro subscription:
                </p>
                <ul style="font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 24px; color: #333;">
                  <li>OCR scanning — photograph ROs and auto-fill hours</li>
                  <li>Pay period exports to Excel</li>
                  <li>Unlimited RO history</li>
                  <li>Spreadsheet view</li>
                </ul>
                <p style="font-size: 14px; color: #555; margin: 0 0 32px;">
                  Only $8.99/month or $79.99/year. Cancel anytime.
                </p>
                <a href="https://ronavigator.com" style="display: inline-block; background: #2B82F0; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                  Keep Pro Access
                </a>
              </div>
            `,
          }),
        });

        logStep("Sent trial_will_end email", { userEmail });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: String(error) });

    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({ processing_error: String(error) })
      .eq("stripe_event_id", event.id);

    // Allow retries by removing lock row after failure.
    await supabaseAdmin
      .from("stripe_webhook_events")
      .delete()
      .eq("stripe_event_id", event.id)
      .is("processed_at", null);

    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
