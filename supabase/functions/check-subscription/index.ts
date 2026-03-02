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
];

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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check pro_overrides table first
    const { data: overrideRow } = await supabaseClient
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

    const stripe = new Stripe(stripeKey);
    // Search up to 10 customers sharing this email
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), { headers, status: 200 });
    }

    logStep("Found Stripe customers", { count: customers.data.length, ids: customers.data.map(c => c.id) });

    // Search all customers for an active or trialing subscription
    let validSub: any = null;
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });
      const found = subscriptions.data.find(
        (s: any) => s.status === "active" || s.status === "trialing"
      );
      if (found) {
        validSub = found;
        logStep("Valid subscription found on customer", { customerId: customer.id });
        break;
      }
    }

    let subscribed = false;
    let productId = null;
    let subscriptionEnd = null;
    let subStatus: string | null = null;

    if (validSub) {
      subscribed = true;
      subStatus = validSub.status;
      subscriptionEnd = new Date(validSub.current_period_end * 1000).toISOString();
      productId = validSub.items.data[0].price.product;
      logStep("Valid subscription found", { subscriptionId: validSub.id, status: subStatus, productId, endDate: subscriptionEnd });
    } else {
      logStep("No active or trialing subscription across all customers");
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

    // Always return 200 with subscribed:false for auth errors —
    // this is a status-check endpoint, not a protected resource.
    return new Response(JSON.stringify({
      subscribed: false,
    }), { headers, status: 200 });
  }
});
