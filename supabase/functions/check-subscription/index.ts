import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Production origins + local dev. Add extra origins (e.g. a staging domain) via the
// EXTRA_ALLOWED_ORIGINS Supabase secret — comma-separated, no trailing slashes.
const BASE_ALLOWED_ORIGINS = [
  "https://ronavigator.com",
  "https://www.ronavigator.com",
  "https://app.ronavigator.com",
  // Local dev
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

const ALLOWED_ORIGINS = [
  ...BASE_ALLOWED_ORIGINS,
  ...(Deno.env.get("EXTRA_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

// Only subscriptions for these product IDs grant Pro access.
const DEFAULT_PRO_PRODUCT_IDS = ["prod_TytAJ1A0OZTgh0", "prod_U2nOsuL3zAYIwa", "prod_U2ndu4y9M2upB3"];
const ENV_PRODUCT_IDS = (Deno.env.get("STRIPE_PRO_PRODUCT_IDS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const PRO_PRODUCT_IDS = ENV_PRODUCT_IDS.length > 0 ? ENV_PRODUCT_IDS : DEFAULT_PRO_PRODUCT_IDS;

const ACCESS_GRANTING_STATUSES = new Set(["active", "trialing"]);
const STATUS_PRIORITY = ["active", "trialing", "past_due", "unpaid", "incomplete", "canceled", "incomplete_expired"];

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

function isUserOwnedCustomer(customer: Stripe.Customer, userId: string, userEmail: string): boolean {
  if (customer.deleted) return false;
  const metadataUserId = customer.metadata?.supabase_user_id;
  if (metadataUserId) return metadataUserId === userId;
  return (customer.email || "").toLowerCase() === userEmail.toLowerCase();
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

function statusRank(status: string | null | undefined): number {
  const normalized = String(status || "");
  const index = STATUS_PRIORITY.indexOf(normalized);
  return index === -1 ? STATUS_PRIORITY.length : index;
}

function pickBestSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  if (subscriptions.length === 0) return null;
  return [...subscriptions].sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return (b.created || 0) - (a.created || 0);
  })[0] || null;
}

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
        status: "override",
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

    let bestSub: Stripe.Subscription | null = null;
    let matchedCustomerId: string | null = null;

    // 3a) If we have a cached customer ID, try that first
    if (cachedCustomerId) {
      logStep("Querying Stripe by cached customer ID");
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: cachedCustomerId,
          status: "all",
          limit: 20,
        });

        const proSubscriptions = subscriptions.data.filter(
          (s: Stripe.Subscription) => s.items.data.some((i: any) => PRO_PRODUCT_IDS.includes(String(i.price?.product)))
        );
        bestSub = pickBestSubscription(proSubscriptions);
        matchedCustomerId = bestSub ? cachedCustomerId : null;
        if (bestSub) {
          logStep("Subscription found via cached customer ID", { subId: bestSub.id, status: bestSub.status });
        }
      } catch {
        logStep("Cached customer ID lookup failed, falling back to email");
      }
    }

    // 3b) Fallback: search by email if no subscription found
    if (!bestSub) {
      logStep("Searching Stripe customers by email");
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      const ownedCustomers = customers.data.filter((customer) => isUserOwnedCustomer(customer, user.id, user.email));

      if (ownedCustomers.length === 0) {
        logStep("No Stripe customer found");
        await supabaseAdmin
          .from("user_settings")
          .update({ is_pro: false, plan: null, pro_expires_at: null, stripe_subscription_id: null })
          .eq("user_id", user.id);
        return new Response(JSON.stringify({ subscribed: false, status: null, subscription_end: null }), { headers, status: 200 });
      }

      logStep("Found candidate Stripe customers", { count: ownedCustomers.length });

      const discoveredSubs: Array<{ customerId: string; sub: Stripe.Subscription }> = [];

      for (const customer of ownedCustomers) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 20,
        });
        const proSubscriptions = subscriptions.data.filter(
          (s: Stripe.Subscription) => s.items.data.some((i: any) => PRO_PRODUCT_IDS.includes(String(i.price?.product)))
        );
        const candidate = pickBestSubscription(proSubscriptions);
        if (candidate) {
          discoveredSubs.push({ customerId: customer.id, sub: candidate });
        }
      }

      const bestDiscovered = discoveredSubs
        .sort((a, b) => {
          const rankDiff = statusRank(a.sub.status) - statusRank(b.sub.status);
          if (rankDiff !== 0) return rankDiff;
          return (b.sub.created || 0) - (a.sub.created || 0);
        })[0];

      if (bestDiscovered) {
        bestSub = bestDiscovered.sub;
        matchedCustomerId = bestDiscovered.customerId;

        logStep("Persisting stripe_customer_id from email fallback", { customerId: matchedCustomerId, subId: bestSub.id });
        await supabaseAdmin
          .from("user_settings")
          .upsert({
            user_id: user.id,
            stripe_customer_id: matchedCustomerId,
            stripe_subscription_id: bestSub.id,
          }, { onConflict: "user_id" });
      }
    }

    let subscribed = false;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let subStatus: string | null = null;

    if (bestSub) {
      subStatus = bestSub.status;
      subscribed = ACCESS_GRANTING_STATUSES.has(String(bestSub.status));
      try {
        const endTs = bestSub.current_period_end;
        if (endTs && typeof endTs === "number") {
          subscriptionEnd = new Date(endTs * 1000).toISOString();
        }
      } catch { /* non-fatal */ }
      productId = String(bestSub.items.data[0]?.price?.product || "") || null;
      logStep("RESULT", { subscribed, subId: bestSub.id, status: subStatus, matchedCustomerId });

      // Sync cache
      await supabaseAdmin
        .from("user_settings")
        .upsert({
          user_id: user.id,
          is_pro: subscribed,
          plan: subscribed ? (subStatus === "trialing" ? "trial" : "pro") : null,
          pro_expires_at: subscribed ? subscriptionEnd : null,
          stripe_subscription_id: bestSub.id,
          stripe_customer_id: matchedCustomerId || cachedCustomerId || null,
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
