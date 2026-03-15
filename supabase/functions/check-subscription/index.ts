import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://ronavigator.com",
  "https://www.ronavigator.com",
  "https://app.ronavigator.com",
];

// Only subscriptions for these product IDs grant Pro access
const PRO_PRODUCT_IDS = ['prod_TytAJ1A0OZTgh0', 'prod_U2nOsuL3zAYIwa', 'prod_U2ndu4y9M2upB3'];

function getSafeOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.includes(refOrigin)) return refOrigin;
    } catch { /* invalid referer */ }
  }
  return null;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const safeOrigin = getSafeOrigin(req);

  if (req.method === "OPTIONS") {
    if (!safeOrigin) return new Response(null, { status: 403 });
    return new Response(null, { headers: corsHeaders(safeOrigin) });
  }

  if (!safeOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = { ...corsHeaders(safeOrigin), "Content-Type": "application/json" };

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // 1) Check pro_overrides table first
    const { data: overrideRow } = await supabaseAdmin
      .from("pro_overrides")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (overrideRow) {
      logStep("Pro override found", { userId: user.id });
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: "override",
        subscription_end: null,
      }), { headers, status: 200 });
    }

    // 2) Try cached stripe_customer_id from user_settings first
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const cachedCustomerId = settings?.stripe_customer_id;
    logStep("Cached stripe_customer_id", { found: !!cachedCustomerId });

    const stripe = new Stripe(stripeKey);

    let validSub: any = null;

    // 3a) If we have a cached customer ID, try that first
    if (cachedCustomerId) {
      logStep("Querying Stripe by cached customer ID");
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: cachedCustomerId,
          limit: 10,
        });
        validSub = subscriptions.data.find(
          (s: any) => (s.status === "active" || s.status === "trialing") &&
            s.items.data.some((i: any) => PRO_PRODUCT_IDS.includes(String(i.price?.product)))
        );
        if (validSub) {
          logStep("Valid sub found via cached customer ID", { subId: validSub.id, status: validSub.status });
        }
      } catch (err) {
        logStep("Cached customer ID lookup failed, falling back to email");
      }
    }

    // 3b) Fallback: search by email if no valid sub found
    if (!validSub) {
      logStep("Searching Stripe customers by email");
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });

      if (customers.data.length === 0) {
        logStep("No Stripe customer found");
        return new Response(JSON.stringify({ subscribed: false }), { headers, status: 200 });
      }

      logStep("Found Stripe customers", { count: customers.data.length });

      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10,
        });
        const found = subscriptions.data.find(
          (s: any) => (s.status === "active" || s.status === "trialing") &&
            s.items.data.some((i: any) => PRO_PRODUCT_IDS.includes(String(i.price?.product)))
        );
        if (found) {
          validSub = found;
          const foundCustomerId = customer.id;
          logStep("Persisting stripe_customer_id from email fallback");
          await supabaseAdmin
            .from("user_settings")
            .upsert({
              user_id: user.id,
              stripe_customer_id: foundCustomerId,
              stripe_subscription_id: found.id,
            }, { onConflict: "user_id" });
          break;
        }
      }
    }

    let subscribed = false;
    let productId = null;
    let subscriptionEnd = null;
    let subStatus: string | null = null;

    if (validSub) {
      subscribed = true;
      subStatus = validSub.status;
      try {
        const endTs = validSub.current_period_end;
        if (endTs && typeof endTs === "number") {
          subscriptionEnd = new Date(endTs * 1000).toISOString();
        }
      } catch { /* non-fatal */ }
      productId = validSub.items.data[0]?.price?.product ?? null;
      logStep("RESULT: subscribed", { subId: validSub.id, status: subStatus });

      // Sync cache
      await supabaseAdmin
        .from("user_settings")
        .upsert({
          user_id: user.id,
          is_pro: true,
          plan: subStatus === "trialing" ? "trial" : "pro",
          pro_expires_at: subscriptionEnd,
          stripe_subscription_id: validSub.id,
        }, { onConflict: "user_id" });
    } else {
      logStep("RESULT: NOT subscribed");
      // Clear stale cache
      await supabaseAdmin
        .from("user_settings")
        .update({ is_pro: false, plan: null, pro_expires_at: null, stripe_subscription_id: null })
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed,
      status: subStatus,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), { headers, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Return 500 so the client's error handler fires and preserves current Pro state
    // instead of resetting it on a transient server/Stripe error.
    return new Response(JSON.stringify({ error: "Subscription check failed" }), {
      headers,
      status: 500,
    });
  }
});
