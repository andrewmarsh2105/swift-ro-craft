import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

type AdminListUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const callerId = userData.user.id;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers,
        status: 403,
      });
    }

    const { action, email, userId, enabled } = await req.json();

    if (action === "search") {
      if (!email || typeof email !== "string") {
        throw new Error("Email is required for search");
      }

      // Use admin API to list users filtered by email
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers({ perPage: 50 });

      if (listError) throw new Error(`Failed to list users: ${listError.message}`);

      // Filter users whose email contains the search string (case-insensitive)
      const query = email.toLowerCase();
      const matchedUsers = ((listData.users || []) as AdminListUser[]).filter(
        (u) => u.email && u.email.toLowerCase().includes(query)
      );

      // Check override status for each matched user
      const results = await Promise.all(
        matchedUsers.slice(0, 20).map(async (u) => {
          const { data: override } = await supabase
            .from("pro_overrides")
            .select("id")
            .eq("user_id", u.id)
            .maybeSingle();

          return {
            id: u.id,
            email: u.email,
            hasOverride: !!override,
            createdAt: u.created_at,
          };
        })
      );

      return new Response(JSON.stringify({ users: results }), {
        headers,
        status: 200,
      });
    }

    if (action === "toggle") {
      if (!userId || typeof enabled !== "boolean") {
        throw new Error("userId and enabled (boolean) are required for toggle");
      }

      if (enabled) {
        const { data: updatedRows, error: updateError } = await supabase
          .from("pro_overrides")
          .update({ reason: "admin_override" })
          .eq("user_id", userId)
          .select("id")
          .limit(1);

        if (updateError) throw new Error(`Failed to enable override: ${updateError.message}`);

        if ((updatedRows?.length ?? 0) === 0) {
          const { error: insertError } = await supabase
            .from("pro_overrides")
            .insert({ user_id: userId, reason: "admin_override" });

          if (insertError?.code === "23505") {
            const { error: retryError } = await supabase
              .from("pro_overrides")
              .update({ reason: "admin_override" })
              .eq("user_id", userId);

            if (retryError) throw new Error(`Failed to enable override: ${retryError.message}`);
          } else if (insertError) {
            throw new Error(`Failed to enable override: ${insertError.message}`);
          }
        }
      } else {
        // Delete override
        const { error: deleteError } = await supabase
          .from("pro_overrides")
          .delete()
          .eq("user_id", userId);

        if (deleteError) throw new Error(`Failed to disable override: ${deleteError.message}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers,
        status: 200,
      });
    }

    if (action === "check-admin") {
      return new Response(JSON.stringify({ isAdmin: true }), {
        headers,
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers,
      status: 500,
    });
  }
});
