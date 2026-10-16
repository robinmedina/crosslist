import { z } from "zod";

export const AnalysisSchema = z.object({
  title: z.string().describe("Search-friendly resale title, 80 characters max"),
  brand: z.string().describe("Brand if visible or confidently identifiable, else empty"),
  category: z.string().describe("Category path, e.g. 'Women > Tops > Blouses'"),
  size: z.string().describe("Size if visible on a tag, else empty"),
  color: z.string(),
  material: z.string().describe("Material if visible on a tag or obvious, else empty"),
  condition: z.enum(["new_with_tags", "new_without_tags", "excellent", "good", "fair"]),
  description: z.string(),
  tags: z.array(z.string()).describe("5 to 10 lowercase search keywords"),
  price: z.object({
    low: z.number().describe("Quick-sale price in USD"),
    mid: z.number().describe("Recommended list price in USD"),
    high: z.number().describe("Patient-seller price in USD"),
    rationale: z.string().describe("One sentence on what drives the price"),
  }),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export interface AnalyzeResponse {
  analysis: Analysis;
  demo: boolean;
  notice?: string;
}

export const DEMO_ANALYSIS: Analysis = {
  title: "Item title — edit me",
  brand: "",
  category: "",
  size: "",
  color: "",
  material: "",
  condition: "good",
  description:
    "Describe the item here.\n\n• Condition: good, light signs of wear\n• Measurements: add when you have them\n\nShips within 1 business day. Bundle to save!",
  tags: [],
  price: { low: 15, mid: 25, high: 35, rationale: "Sample prices — photo analysis is off." },
};
