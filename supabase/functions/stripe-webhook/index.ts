import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const supabaseUserId = session.client_reference_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        logStep("checkout.session.completed", { supabaseUserId, customerId, subscriptionId });

        if (supabaseUserId && customerId) {
          await supabaseAdmin
            .from("user_settings")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              is_pro: true,
              plan: "trial",
            })
            .eq("user_id", supabaseUserId);
          logStep("Updated user_settings after checkout", { supabaseUserId });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const status = subscription.status;
        const supabaseUserId = subscription.metadata?.supabase_user_id;

        logStep("subscription.created/updated", { customerId, status, supabaseUserId, subId: subscription.id });

        const isActive = status === "active" || status === "trialing";
        let subscriptionEnd: string | null = null;
        try {
          if (subscription.current_period_end && typeof subscription.current_period_end === "number") {
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
        } catch { /* non-fatal */ }

        const updateData: Record<string, any> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          is_pro: isActive,
          plan: status === "trialing" ? "trial" : isActive ? "pro" : null,
          pro_expires_at: subscriptionEnd,
        };

        // Try by supabase_user_id metadata first, fallback to stripe_customer_id
        if (supabaseUserId) {
          await supabaseAdmin
            .from("user_settings")
            .update(updateData)
            .eq("user_id", supabaseUserId);
          logStep("Updated via supabase_user_id", { supabaseUserId });
        } else {
          // Fallback: find user by stripe_customer_id
          const { data: settingsRows } = await supabaseAdmin
            .from("user_settings")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .limit(1);

          if (settingsRows && settingsRows.length > 0) {
            await supabaseAdmin
              .from("user_settings")
              .update(updateData)
              .eq("user_id", settingsRows[0].user_id);
            logStep("Updated via stripe_customer_id lookup", { userId: settingsRows[0].user_id });
          } else {
            logStep("No user found for customer", { customerId });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const supabaseUserId = subscription.metadata?.supabase_user_id;

        logStep("subscription.deleted", { customerId, supabaseUserId, subId: subscription.id });

        const clearData = {
          is_pro: false,
          plan: null,
          pro_expires_at: null,
          stripe_subscription_id: null,
        };

        if (supabaseUserId) {
          await supabaseAdmin
            .from("user_settings")
            .update(clearData)
            .eq("user_id", supabaseUserId);
        } else {
          const { data: settingsRows } = await supabaseAdmin
            .from("user_settings")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .limit(1);

          if (settingsRows && settingsRows.length > 0) {
            await supabaseAdmin
              .from("user_settings")
              .update(clearData)
              .eq("user_id", settingsRows[0].user_id);
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
