import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RO Navigator <noreply@ronavigator.com>",
        to: [email],
        subject: "Welcome to RO Navigator",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #111;">
            <div style="margin-bottom: 32px;">
              <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 4px;">Welcome to RO Navigator</h1>
              <p style="font-size: 14px; color: #666; margin: 0;">Track your flat-rate hours. Get paid what you're owed.</p>
            </div>

            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Your account is ready. Here's how to get started in 3 steps:
            </p>

            <div style="border-left: 3px solid #2B82F0; padding-left: 16px; margin-bottom: 16px;">
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">1. Log your first RO</p>
              <p style="font-size: 14px; color: #555; margin: 0;">Tap the + button and enter your RO number and labor hours.</p>
            </div>

            <div style="border-left: 3px solid #2B82F0; padding-left: 16px; margin-bottom: 16px;">
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">2. Check your Summary</p>
              <p style="font-size: 14px; color: #555; margin: 0;">See total hours for the day, week, or pay period at a glance.</p>
            </div>

            <div style="border-left: 3px solid #2B82F0; padding-left: 16px; margin-bottom: 32px;">
              <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">3. Use your 14-day free trial</p>
              <p style="font-size: 14px; color: #555; margin: 0;">You get full access for 14 days. After that, unlock RO Navigator with a one-time $15.99 payment for lifetime access.</p>
            </div>

            <a href="https://ronavigator.com" style="display: inline-block; background: #2B82F0; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 40px;">
              Open RO Navigator
            </a>

            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;" />
            <p style="font-size: 12px; color: #999; margin: 0;">
              Questions? Reply to this email or visit <a href="https://ronavigator.com/support" style="color: #2B82F0;">ronavigator.com/support</a>.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending welcome email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
