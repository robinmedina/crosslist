export type MarketplaceId =
  | "ebay"
  | "etsy"
  | "depop"
  | "poshmark"
  | "vinted"
  | "whatnot";

export type Condition =
  | "new_with_tags"
  | "new_without_tags"
  | "excellent"
  | "good"
  | "fair";

export type ListingStatus =
  | "off"
  | "publishing"
  | "live"
  | "sold"
  | "delisted";

export interface MarketplaceListing {
  enabled: boolean;
  status: ListingStatus;
  /** Per-marketplace price override. Falls back to the item price. */
  price?: number;
  publishedAt?: number;
}

export interface PriceSuggestion {
  low: number;
  mid: number;
  high: number;
  rationale: string;
}

export interface Item {
  id: string;
  createdAt: number;
  updatedAt: number;
  photos: string[];
  title: string;
  description: string;
  price: number;
  priceSuggestion?: PriceSuggestion;
  category: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  condition: Condition;
  tags: string[];
  weightOz?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  quantity: number;
  sku: string;
  marketplaces: Record<MarketplaceId, MarketplaceListing>;
  sold?: { marketplace: MarketplaceId; price: number; at: number };
  /** True when the photo analysis ran without an API key. */
  demoAnalysis?: boolean;
}

export const CONDITIONS: { id: Condition; label: string }[] = [
  { id: "new_with_tags", label: "New with tags" },
  { id: "new_without_tags", label: "New, no tags" },
  { id: "excellent", label: "Excellent" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
];
