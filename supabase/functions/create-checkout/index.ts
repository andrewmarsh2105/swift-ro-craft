import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://ronavigator.com",
  "https://www.ronavigator.com",
  "https://app.ronavigator.com",
  "https://swift-ro-craft.lovable.app",
  "https://id-preview--8ac751f9-d68d-4c8e-af8e-03a2567a030a.lovable.app",
  "https://8ac751f9-d68d-4c8e-af8e-03a2567a030a.lovableproject.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const SUBSCRIPTION_BLOCKING_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "incomplete",
]);

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

const monthlyPrice = Deno.env.get("STRIPE_PRICE_MONTHLY");
const yearlyPrice = Deno.env.get("STRIPE_PRICE_YEARLY");
if (!monthlyPrice || !yearlyPrice) {
  throw new Error("STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY env vars must be set");
}
const PRICES: Record<string, string> = {
  monthly: monthlyPrice,
  yearly: yearlyPrice,
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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw new Error(`Authentication error: ${authError.message}`);

    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    let plan: "monthly" | "yearly" = "monthly";
    let requestId = "";
    try {
      const body = await req.json();
      if (body?.plan === "yearly") plan = "yearly";
      if (typeof body?.request_id === "string") {
        requestId = body.request_id.trim().slice(0, 80);
      }
    } catch { /* default monthly */ }

    const priceId = PRICES[plan];
    const stripe = new Stripe(stripeKey);

    // Try cached customer ID first
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId: string | undefined = settings?.stripe_customer_id || undefined;

    // Validate cached ID or search by email
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted || !isUserOwnedCustomer(customer, user.id, user.email)) {
          customerId = undefined;
        }
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      const matched = customers.data.find((c) => isUserOwnedCustomer(c, user.id, user.email));
      if (matched) {
        customerId = matched.id;
      }
    }

    if (customerId) {
      // Keep metadata in sync for downstream webhook mapping
      await stripe.customers.update(customerId, {
        metadata: { supabase_user_id: user.id },
      });

      // Prevent duplicate / overlapping subscriptions
      const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      const blockingSub = existing.data.find((s: any) => SUBSCRIPTION_BLOCKING_STATUSES.has(String(s.status)));
      if (blockingSub) {
        console.log("[CREATE-CHECKOUT] Existing subscription found, redirecting to portal", {
          customerId,
          subId: blockingSub.id,
          status: blockingSub.status,
        });
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${safeOrigin}/`,
        });
        return new Response(JSON.stringify({ url: portalSession.url, already_subscribed: true, version: "2026-03-19a" }), { headers, status: 200 });
      }
    } else {
      // Create new Stripe customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
      console.log("[CREATE-CHECKOUT] Created new Stripe customer", { customerId, email: user.email });
    }

    // Persist stripe_customer_id — upsert handles users who have no settings row yet
    await supabaseAdmin
      .from("user_settings")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });

    const idempotencyKey = requestId
      ? `checkout_${user.id}_${requestId}`
      : `checkout_${user.id}_${plan}_${new Date().toISOString().slice(0, 16)}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: { supabase_user_id: user.id },
      },
      custom_text: {
        submit: {
          message: "Your 7-day free trial starts now — you won't be charged until the trial ends. Cancel anytime.",
        },
      },
      success_url: `${safeOrigin}/?checkout=success`,
      cancel_url: `${safeOrigin}/?checkout=cancel`,
    }, {
      idempotencyKey,
    });

    return new Response(JSON.stringify({ url: session.url, version: "2026-03-19a" }), { headers, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError = errorMessage.includes("not authenticated") ||
                        errorMessage.includes("Authorization") ||
                        errorMessage.includes("Auth session") ||
                        errorMessage.includes("authentication error") ||
                        errorMessage.includes("No authorization header");
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers,
      status: isAuthError ? 401 : 500,
    });
  }
});
