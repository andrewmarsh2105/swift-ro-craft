import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    } catch { /* invalid referer */ }
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

serve(async (req) => {
  const safeOrigin = getSafeOrigin(req);

  if (req.method === "OPTIONS") {
    if (!safeOrigin) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders(safeOrigin) });
  }

  if (!safeOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = { ...corsHeaders(safeOrigin), "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const { storagePath } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath is required" }), { status: 400, headers });
    }

    // Get signed URL for the uploaded pay stub image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("ro-photos")
      .createSignedUrl(storagePath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not access uploaded image" }), { status: 500, headers });
    }

    // Fetch the image and convert to base64
    const imageRes = await fetch(signedUrlData.signedUrl);
    if (!imageRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch image" }), { status: 500, headers });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const uint8 = new Uint8Array(imageBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const base64Image = btoa(binary);

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();

    const systemPrompt = `You are a pay stub data extraction assistant. Extract pay information from this technician pay stub image.

Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
  "totalHours": <number or null>,
  "grossPay": <number or null>,
  "warrantyHours": <number or null>,
  "customerPayHours": <number or null>,
  "internalHours": <number or null>,
  "periodStart": <"YYYY-MM-DD" or null>,
  "periodEnd": <"YYYY-MM-DD" or null>,
  "technicianName": <string or null>,
  "shopName": <string or null>,
  "confidence": {
    "totalHours": <0.0-1.0>,
    "grossPay": <0.0-1.0>,
    "warrantyHours": <0.0-1.0>,
    "customerPayHours": <0.0-1.0>,
    "internalHours": <0.0-1.0>
  }
}

Extraction rules:
- totalHours: The total paid/flagged hours for this period. Look for labels like "Total Hours", "Paid Hours", "Flat Hours", "Clocked Hours".
- grossPay: The gross earnings before deductions. Look for "Gross Pay", "Total Pay", "Gross Earnings", "Gross Wages".
- warrantyHours: Hours labeled "Warranty", "W", or "WTY". Return null if not shown separately.
- customerPayHours: Hours labeled "Customer Pay", "CP", "RO". Return null if not shown separately.
- internalHours: Hours labeled "Internal", "I", "INT". Return null if not shown separately.
- periodStart/periodEnd: The pay period dates. Normalize to YYYY-MM-DD. Return null if not found.
- technicianName/shopName: Names if visible. Return null if not found.
- All numeric values must be plain numbers (not strings). Return null if a field is not visible.
- Set confidence to 1.0 if clearly labeled, 0.7 if inferred from context, 0.4 if uncertain.
- Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
              { type: "text", text: "Extract pay stub data from this image." },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      return new Response(JSON.stringify({ error: "OCR processing failed" }), { status: 500, headers });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let extracted;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse pay stub OCR result:", content);
      return new Response(JSON.stringify({ error: "Failed to parse OCR results", rawContent: content }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify(extracted), { headers });
  } catch (err) {
    console.error("Pay stub extraction error:", err);
    const safeOriginFallback = getSafeOrigin(req);
    const errHeaders = safeOriginFallback
      ? { ...corsHeaders(safeOriginFallback), "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: errHeaders,
    });
  }
});
