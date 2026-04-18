import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { writeUserSettingsByUserId } from "../_shared/user-settings-write.ts";
import { readUserSettingsByUserId } from "../_shared/user-settings-read.ts";

const BASE_ALLOWED_ORIGINS = [
  "https://ronavigator.com",
  "https://www.ronavigator.com",
  "https://app.ronavigator.com",
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

function getSafeOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.includes(refOrigin)) return refOrigin;
    } catch {
      // invalid referer
    }
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

const lifetimePrice = Deno.env.get("STRIPE_PRICE_LIFETIME");
if (!lifetimePrice) {
  throw new Error("STRIPE_PRICE_LIFETIME env var must be set");
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw new Error(`Authentication error: ${authError.message}`);

    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { data: overrideRow } = await supabaseAdmin
      .from("pro_overrides")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { row: accessRow, duplicateCount: accessDuplicateCount, error: accessReadError } = await readUserSettingsByUserId(
      supabaseAdmin,
      user.id,
      "lifetime_access, updated_at, created_at",
      ["lifetime_access"],
    );
    if (accessReadError) {
      throw new Error(`Failed to read user settings: ${accessReadError.message}`);
    }
    if (accessDuplicateCount > 0) {
      console.warn("[CREATE-CHECKOUT] Duplicate user_settings rows detected during access read", {
        userId: user.id,
        duplicateCount: accessDuplicateCount,
      });
    }

    if (overrideRow || accessRow?.lifetime_access === true) {
      return new Response(JSON.stringify({
        already_unlocked: true,
        status: overrideRow ? "override" : "lifetime",
      }), { headers, status: 200 });
    }

    let requestId = "";
    try {
      const body = await req.json();
      if (typeof body?.request_id === "string") {
        requestId = body.request_id.trim().slice(0, 80);
      }
    } catch {
      // optional request body
    }

    const stripe = new Stripe(stripeKey);

    const { row: settings, duplicateCount: customerDuplicateCount, error: customerReadError } = await readUserSettingsByUserId(
      supabaseAdmin,
      user.id,
      "stripe_customer_id, updated_at, created_at",
      ["stripe_customer_id"],
    );
    if (customerReadError) {
      throw new Error(`Failed to read Stripe customer mapping: ${customerReadError.message}`);
    }
    if (customerDuplicateCount > 0) {
      console.warn("[CREATE-CHECKOUT] Duplicate user_settings rows detected during customer read", {
        userId: user.id,
        duplicateCount: customerDuplicateCount,
      });
    }

    let customerId: string | undefined = settings?.stripe_customer_id || undefined;

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
      if (matched) customerId = matched.id;
    }

    if (customerId) {
      await stripe.customers.update(customerId, {
        metadata: { supabase_user_id: user.id },
      });
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
      console.log("[CREATE-CHECKOUT] Created new Stripe customer", { customerId, email: user.email });
    }

    const { error: customerWriteError } = await writeUserSettingsByUserId(supabaseAdmin, user.id, {
      stripe_customer_id: customerId,
    });

    if (customerWriteError) {
      throw new Error(`Failed to persist Stripe customer: ${customerWriteError.message}`);
    }

    const idempotencyKey = requestId
      ? `checkout_${user.id}_${requestId}`
      : `checkout_${user.id}_${new Date().toISOString().slice(0, 16)}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        access_type: "lifetime",
      },
      line_items: [{ price: lifetimePrice, quantity: 1 }],
      mode: "payment",
      success_url: `${safeOrigin}/?checkout=success`,
      cancel_url: `${safeOrigin}/?checkout=cancel`,
    }, {
      idempotencyKey,
    });

    return new Response(JSON.stringify({ url: session.url, version: "2026-04-18-lifetime" }), { headers, status: 200 });
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
