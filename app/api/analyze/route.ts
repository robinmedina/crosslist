import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema, DEMO_ANALYSIS, type AnalyzeResponse } from "@/lib/analysis";

const SYSTEM = `You help people resell secondhand items on Depop, Poshmark, Vinted, Whatnot, eBay and Etsy.
From the photos, identify the item and draft a listing a seller can post as-is and refine later.

- Title: lead with brand, then item type, key attributes (color, material, style, size). Max 80 characters. No emojis or all-caps.
- Only fill brand, size and material when a tag, logo or construction makes it clear; otherwise leave them empty rather than guess.
- Condition: judge from visible wear. Use new_with_tags only if a retail tag is visible.
- Description: 2 short sentences describing the item and its appeal, then bullet lines (•) for condition notes, material, fit or measurements to add, then "Ships within 1 business day." Plain text, no markdown headers.
- Price: estimate typical sold prices for this item in the US secondhand market. low = sells within days, mid = recommended list price, high = patient seller. Whole dollars.`;

export async function POST(request: Request) {
  const { photos } = (await request.json()) as { photos?: string[] };
  if (!photos?.length) {
    return Response.json({ error: "Add at least one photo." }, { status: 400 });
  }

  const images = photos.slice(0, 4).map((dataUrl) => {
    const [, mediaType, data] = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/) ?? [];
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data,
      },
    };
  });

  try {
    // Created per request so a missing key surfaces here and falls back to demo mode.
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Low effort keeps the photo-to-draft step fast; sellers edit afterwards.
      output_config: { effort: "low", format: betaZodOutputFormat(AnalysisSchema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [...images, { type: "text", text: "Draft a resale listing for this item." }],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json(
        { error: "Couldn't read this photo. Try another angle or fill in the details yourself." },
        { status: 422 },
      );
    }
    return Response.json({ analysis: response.parsed_output, demo: false } satisfies AnalyzeResponse);
  } catch (err) {
    if (err instanceof Anthropic.APIError && err.status !== 401 && err.status !== 403) {
      console.error("analyze failed", err);
      return Response.json(
        { error: "Photo analysis is unavailable right now. Try again in a moment." },
        { status: 502 },
      );
    }
    // No usable credentials: keep the flow working with editable sample text.
    console.warn("analyze: no Anthropic credentials, returning demo draft");
    return Response.json({
      analysis: DEMO_ANALYSIS,
      demo: true,
      notice: "Photo analysis is off. Set ANTHROPIC_API_KEY to get AI titles, descriptions and prices.",
    } satisfies AnalyzeResponse);
  }
}
