import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://ronavigator.com",
  "https://www.ronavigator.com",
  "https://swift-ro-craft.lovable.app",
  "https://id-preview--8ac751f9-d68d-4c8e-af8e-03a2567a030a.lovable.app",
];

function getSafeOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  // Fallback: check referer
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

const PRICES: Record<string, string> = {
  monthly: "price_1T4ho7QViI7PZv2KuEFblmXS",
  yearly: "price_1T4i2KQViI7PZv2KS0I87NX0",
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

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Parse plan from request body
    let plan = "monthly";
    try {
      const body = await req.json();
      if (body?.plan === "yearly") plan = "yearly";
    } catch {
      // No body or invalid JSON — default to monthly
    }

    const priceId = PRICES[plan];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      },
      custom_text: {
        submit: {
          message: "Your 7-day free trial starts now — you won't be charged until the trial ends. Cancel anytime.",
        },
      },
      success_url: `${safeOrigin}/?checkout=success`,
      cancel_url: `${safeOrigin}/?checkout=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), { headers, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError = errorMessage.includes("not authenticated") ||
                        errorMessage.includes("Authorization") ||
                        errorMessage.includes("Auth session");
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers,
      status: isAuthError ? 401 : 500,
    });
  }
});
