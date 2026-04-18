import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type PostgrestError, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { writeUserSettingsByUserId } from "../_shared/user-settings-write.ts";
import { pickBestUserSettingsRow } from "../_shared/user-settings-read.ts";

type StripeEventClaimError = Pick<PostgrestError, "code" | "message">;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

async function findUserIdByCustomerId(supabaseAdmin: SupabaseClient, customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;

  const { data: settingsRows, error } = await supabaseAdmin
    .from("user_settings")
    .select("user_id, updated_at, created_at")
    .eq("stripe_customer_id", customerId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logStep("Failed to find user by customer id", { customerId, error: error.message });
    return null;
  }

  if (!settingsRows || settingsRows.length === 0) return null;
  const bestRow = pickBestUserSettingsRow(settingsRows, ["user_id"]);
  if (settingsRows.length > 1) {
    logStep("Duplicate user_settings rows found for stripe customer id", { customerId, duplicateCount: settingsRows.length - 1 });
  }
  return typeof bestRow.user_id === "string" ? bestRow.user_id : null;
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
    const code = (claimError as StripeEventClaimError).code || "";
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
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "payment") {
          logStep("Ignoring checkout.session.completed with non-payment mode", { sessionId: session.id, mode: session.mode });
          break;
        }

        if (session.payment_status !== "paid") {
          logStep("Ignoring unpaid checkout.session.completed", { sessionId: session.id, payment_status: session.payment_status });
          break;
        }

        const metadataUserId = typeof session.metadata?.supabase_user_id === "string" ? session.metadata.supabase_user_id : null;
        const refUserId = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
        const supabaseUserId = metadataUserId || refUserId || await findUserIdByCustomerId(supabaseAdmin, String(session.customer || ""));

        if (!supabaseUserId) {
          logStep("No user found for completed checkout session", { sessionId: session.id, customerId: session.customer });
          break;
        }

        const { error: webhookWriteError } = await writeUserSettingsByUserId(supabaseAdmin, supabaseUserId, {
          stripe_customer_id: session.customer ? String(session.customer) : null,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent ? String(session.payment_intent) : null,
          lifetime_access: true,
          lifetime_unlocked_at: new Date().toISOString(),
          is_pro: true,
          plan: "lifetime",
          pro_expires_at: null,
        });

        if (webhookWriteError) {
          throw new Error(`Failed to persist webhook access state: ${webhookWriteError.message}`);
        }

        logStep("Lifetime access unlocked", {
          supabaseUserId,
          sessionId: session.id,
          customerId: session.customer,
          paymentIntent: session.payment_intent,
        });
        break;
      }

      // Kept for compatibility while old webhook retries drain, but no longer used for access.
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.payment_failed":
      case "invoice.paid":
      case "customer.subscription.trial_will_end": {
        logStep("Legacy subscription webhook ignored", { type: event.type });
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
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });

    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({ processing_error: message })
      .eq("stripe_event_id", event.id);

    await supabaseAdmin
      .from("stripe_webhook_events")
      .delete()
      .eq("stripe_event_id", event.id)
      .is("processed_at", null);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
