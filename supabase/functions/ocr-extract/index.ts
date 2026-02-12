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
  "date": "YYYY-MM-DD or null",
  "customerName": "string or null",
  "vehicleYear": number or null (4-digit year),
  "vehicleMake": "string or null",
  "vehicleModel": "string or null",
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

Rules:
- Extract ALL line items you can see, each as a separate entry in lines array
- If hours are not visible, set to 0
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

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OCR extraction error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
