import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

type AccessStatus = "trialing" | "lifetime" | "expired" | "override" | null;

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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { data: overrideRow } = await supabaseAdmin
      .from("pro_overrides")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const now = new Date();

    if (overrideRow) {
      await supabaseAdmin
        .from("user_settings")
        .upsert({
          user_id: user.id,
          is_pro: true,
          plan: "override",
          pro_expires_at: null,
        }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: true,
        status: "override",
        subscription_end: null,
      }), { headers, status: 200 });
    }

    const { data: existingSettings } = await supabaseAdmin
      .from("user_settings")
      .select("trial_started_at, trial_ends_at, lifetime_access")
      .eq("user_id", user.id)
      .maybeSingle();

    let trialStartedAt = existingSettings?.trial_started_at ?? null;
    let trialEndsAt = existingSettings?.trial_ends_at ?? null;
    const lifetimeAccess = existingSettings?.lifetime_access === true;

    if (!trialStartedAt || !trialEndsAt) {
      trialStartedAt = now.toISOString();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 14);
      trialEndsAt = trialEnd.toISOString();

      await supabaseAdmin
        .from("user_settings")
        .upsert({
          user_id: user.id,
          trial_started_at: trialStartedAt,
          trial_ends_at: trialEndsAt,
        }, { onConflict: "user_id" });
    }

    let status: AccessStatus = null;
    let subscribed = false;

    if (lifetimeAccess) {
      status = "lifetime";
      subscribed = true;
    } else if (trialEndsAt && new Date(trialEndsAt).getTime() > now.getTime()) {
      status = "trialing";
      subscribed = true;
    } else {
      status = "expired";
      subscribed = false;
    }

    await supabaseAdmin
      .from("user_settings")
      .upsert({
        user_id: user.id,
        is_pro: subscribed,
        plan: status === "trialing"
          ? "trial"
          : status === "lifetime"
            ? "lifetime"
            : status === "override"
              ? "override"
              : "expired",
        pro_expires_at: status === "trialing" ? trialEndsAt : null,
      }, { onConflict: "user_id" });

    return new Response(JSON.stringify({
      subscribed,
      status,
      subscription_end: status === "trialing" || status === "expired" ? trialEndsAt : null,
    }), { headers, status: 200 });
  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: "Subscription check failed" }), {
      headers,
      status: 500,
    });
  }
});
