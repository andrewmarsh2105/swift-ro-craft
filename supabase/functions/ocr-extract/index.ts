import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storagePath, templateFieldMap } = await req.json();

    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signed URL for the image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("ro-photos")
      .createSignedUrl(storagePath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to get image URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download image and convert to base64 (chunk to avoid stack overflow)
    const imageResponse = await fetch(signedUrlData.signedUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Image = btoa(binary);
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Call Lovable AI Gateway with vision model
    const systemPrompt = `You are an OCR specialist for automotive repair orders. Extract structured data from the repair order image.

Return a JSON object with this exact structure:
{
  "roNumber": "string or null",
  "advisor": "string or null",
  "date": "YYYY-MM-DD or null (the best candidate date — see candidateDates)",
  "customerName": "string or null",
  "mileage": "string or null (odometer/mileage reading if visible)",
  "vehicleYear": number or null (4-digit year),
  "vehicleMake": "string or null",
  "vehicleModel": "string or null",
  "candidateDates": [
    {
      "value": "YYYY-MM-DD",
      "source": "header" | "text",
      "originalFormat": "string — the raw date string as it appeared on the document"
    }
  ],
  "lines": [
    {
      "description": "string - the work/service description",
      "hours": number or 0,
      "laborType": "warranty" | "customer-pay" | "internal" (default "customer-pay"),
      "confidence": number between 0 and 1
    }
  ],
  "fieldConfidence": {
    "roNumber": number between 0 and 1,
    "advisor": number between 0 and 1,
    "date": number between 0 and 1
  }
}

CRITICAL — Labor hours extraction priority:
- ALWAYS prioritize explicit labor times printed on the ticket (e.g. "0.7", "1.5h", "2.0 hrs").
- If a line shows an explicit time value, use that EXACTLY — do NOT override or guess.
- If a line has NO explicit time, set hours to 0 and confidence LOW (e.g. 0.2-0.4).
- Never infer or estimate hours from the description alone.

Date extraction rules:
- Find ALL date-like strings visible on the document.
- Support these formats: MM/DD/YYYY, M/D/YY, MM-DD-YYYY, YYYY-MM-DD, "Month D, YYYY"
- Normalize every date to "YYYY-MM-DD" in the "value" field.
- For 2-digit years: 00-49 → 2000-2049, 50-99 → 1950-1999.
- Set "source" to "header" for dates found near the RO number / date label area, or "text" for dates found elsewhere in the body.
- Keep the raw string in "originalFormat".
- For the top-level "date" field, pick the single best candidate (usually the one labeled "Date" or "RO Date" in the header).
- Include ALL found dates in "candidateDates" (including the chosen one).

Other rules:
- Extract ALL line items you can see, each as a separate entry in lines array
- Look for mileage/odometer readings (often labeled "Mileage", "Odo", "Miles In", etc.)
- Set confidence based on how clear/readable the text is
- For labor type, default to "customer-pay" unless you see warranty or internal indicators
- Return ONLY valid JSON, no markdown formatting`;

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
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
              {
                type: "text",
                text: templateFieldMap
                  ? `Extract data from this repair order image. Focus on these regions: ${JSON.stringify(templateFieldMap)}`
                  : "Extract all data from this repair order image.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      return new Response(JSON.stringify({ error: "OCR processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    let extracted;
    try {
      // Strip markdown code fences if present
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse OCR result:", content);
      return new Response(JSON.stringify({
        error: "Failed to parse OCR results",
        rawContent: content,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Server-side date candidate filtering & ranking ---
    const rawCandidates: Array<{ value: string; source: string; originalFormat: string }> =
      Array.isArray(extracted.candidateDates) ? extracted.candidateDates : [];

    const now = new Date();
    const currentYear = now.getFullYear();
    // Local today as YYYY-MM-DD
    const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    function daysBetween(a: string, b: string): number {
      // Pure date-only diff (no TZ issues)
      const [ay, am, ad] = a.split("-").map(Number);
      const [by, bm, bd] = b.split("-").map(Number);
      const da = Date.UTC(ay, am - 1, ad);
      const db = Date.UTC(by, bm - 1, bd);
      return Math.abs(da - db) / 86400000;
    }

    function isReasonableDate(d: string): boolean {
      const parts = d.split("-").map(Number);
      if (parts.length !== 3) return false;
      const [y, m, dd] = parts;
      if (y < 2000 || y > currentYear + 1) return false;
      if (m < 1 || m > 12 || dd < 1 || dd > 31) return false;
      return true;
    }

    const validCandidates = rawCandidates
      .filter((c) => c.value && isReasonableDate(c.value))
      .map((c) => ({
        ...c,
        diff: daysBetween(c.value, todayStr),
        has4DigitYear: c.originalFormat ? /\b\d{4}\b/.test(c.originalFormat) : false,
      }));

    if (validCandidates.length > 0) {
      // Sort: primary window (<=30d) first, then secondary (<=180d), then rest
      // Within each tier: smallest diff wins; tie-break: header > text, 4-digit year preferred
      validCandidates.sort((a, b) => {
        const tierA = a.diff <= 30 ? 0 : a.diff <= 180 ? 1 : 2;
        const tierB = b.diff <= 30 ? 0 : b.diff <= 180 ? 1 : 2;
        if (tierA !== tierB) return tierA - tierB;
        if (a.diff !== b.diff) return a.diff - b.diff;
        // Prefer header source
        if (a.source === "header" && b.source !== "header") return -1;
        if (b.source === "header" && a.source !== "header") return 1;
        // Prefer 4-digit year
        if (a.has4DigitYear && !b.has4DigitYear) return -1;
        if (b.has4DigitYear && !a.has4DigitYear) return 1;
        return 0;
      });

      // Set the best candidate as the selected date
      extracted.date = validCandidates[0].value;
      // Return top 3 candidates
      extracted.candidateDates = validCandidates.slice(0, 3).map(({ value, source, originalFormat }) => ({
        value,
        source,
        originalFormat,
      }));
    } else {
      extracted.candidateDates = [];
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OCR extraction error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
