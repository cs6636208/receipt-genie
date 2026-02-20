import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth check ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // ────────────────────────────────────────────────────────────

  try {
    const { imageBase64 } = await req.json();

    // ── Input validation ─────────────────────────────────────
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Max ~10 MB (base64 is ~37% larger than original)
    const MAX_BASE64_LEN = 10 * 1024 * 1024 * 1.37;
    if (imageBase64.length > MAX_BASE64_LEN) {
      return new Response(JSON.stringify({ error: "Image too large (max 10MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate base64 characters
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ────────────────────────────────────────────────────────────

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a receipt analyzer. Extract data from receipt images and return structured JSON.
Always respond with a JSON object using this exact schema:
{
  "store_name": "string",
  "receipt_date": "YYYY-MM-DD",
  "items": [
    {
      "item_name": "string",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "category": "string"
    }
  ],
  "total_amount": number,
  "category": "string"
}

Categories must be one of: food, groceries, transport, health, entertainment, utilities, shopping, other.
The main category should be the most common category among items.
If you cannot read a value, use null. Always return valid JSON only, no markdown.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this receipt image and extract all items, prices, store name, date, and total. Return JSON only.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_receipt_data",
                description: "Extract structured data from a receipt image",
                parameters: {
                  type: "object",
                  properties: {
                    store_name: { type: "string" },
                    receipt_date: { type: "string", description: "YYYY-MM-DD format" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item_name: { type: "string" },
                          quantity: { type: "number" },
                          unit_price: { type: "number" },
                          total_price: { type: "number" },
                          category: {
                            type: "string",
                            enum: ["food", "groceries", "transport", "health", "entertainment", "utilities", "shopping", "other"],
                          },
                        },
                        required: ["item_name", "total_price", "category"],
                      },
                    },
                    total_amount: { type: "number" },
                    category: {
                      type: "string",
                      enum: ["food", "groceries", "transport", "health", "entertainment", "utilities", "shopping", "other"],
                    },
                  },
                  required: ["store_name", "items", "total_amount", "category"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_receipt_data" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    
    let receiptData;
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      receiptData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = aiResult.choices?.[0]?.message?.content || "";
      receiptData = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    return new Response(JSON.stringify({ data: receiptData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-receipt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
