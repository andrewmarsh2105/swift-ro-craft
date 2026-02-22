import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      const matchedUsers = (listData.users || []).filter(
        (u: any) => u.email && u.email.toLowerCase().includes(query)
      );

      // Check override status for each matched user
      const results = await Promise.all(
        matchedUsers.slice(0, 20).map(async (u: any) => {
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "toggle") {
      if (!userId || typeof enabled !== "boolean") {
        throw new Error("userId and enabled (boolean) are required for toggle");
      }

      if (enabled) {
        // Insert override (upsert to avoid duplicates)
        const { error: insertError } = await supabase
          .from("pro_overrides")
          .upsert({ user_id: userId, reason: "admin_override" }, { onConflict: "user_id" });

        if (insertError) throw new Error(`Failed to enable override: ${insertError.message}`);
      } else {
        // Delete override
        const { error: deleteError } = await supabase
          .from("pro_overrides")
          .delete()
          .eq("user_id", userId);

        if (deleteError) throw new Error(`Failed to disable override: ${deleteError.message}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "check-admin") {
      return new Response(JSON.stringify({ isAdmin: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
