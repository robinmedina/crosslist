import type { Item, MarketplaceId } from "./types";

export interface Marketplace {
  id: MarketplaceId;
  name: string;
  /** Brand-adjacent swatch used for the status dot. */
  swatch: string;
  titleLimit?: number;
  /** Estimated seller fees in USD for a given sale price. */
  fee: (price: number) => number;
  feeNote: string;
  /** Fields this marketplace needs before a listing can go live. */
  required: (keyof Item)[];
  note?: string;
}

// Fee figures are public US seller rates as of 2026 and are estimates only:
// promoted listings, category exceptions and shipping fees are ignored.
export const MARKETPLACES: Marketplace[] = [
  {
    id: "ebay",
    name: "eBay",
    swatch: "#3665f3",
    titleLimit: 80,
    fee: (p) => p * 0.136 + 0.4,
    feeNote: "13.6% + $0.40",
    required: ["title", "category", "condition", "weightOz"],
  },
  {
    id: "poshmark",
    name: "Poshmark",
    swatch: "#7f0353",
    titleLimit: 80,
    fee: (p) => (p < 15 ? 2.95 : p * 0.2),
    feeNote: "20%, or $2.95 under $15",
    required: ["title", "brand", "size", "category"],
  },
  {
    id: "depop",
    name: "Depop",
    swatch: "#ff2300",
    fee: (p) => p * 0.033 + 0.45,
    feeNote: "3.3% + $0.45 processing",
    required: ["description", "category", "condition"],
  },
  {
    id: "vinted",
    name: "Vinted",
    swatch: "#09b1ba",
    fee: () => 0,
    feeNote: "0% (buyer pays)",
    required: ["title", "brand", "size", "condition"],
  },
  {
    id: "whatnot",
    name: "Whatnot",
    swatch: "#c9b800",
    fee: (p) => p * 0.109 + 0.3,
    feeNote: "8% + 2.9% + $0.30",
    required: ["title", "category", "weightOz"],
  },
  {
    id: "etsy",
    name: "Etsy",
    swatch: "#f1641e",
    titleLimit: 140,
    fee: (p) => p * 0.095 + 0.45,
    feeNote: "6.5% + 3% + $0.45",
    required: ["title", "tags", "category"],
    note: "Etsy only allows handmade, vintage (20+ years old) or craft supplies.",
  },
];

export const MARKETPLACE_BY_ID = Object.fromEntries(
  MARKETPLACES.map((m) => [m.id, m]),
) as Record<MarketplaceId, Marketplace>;

export function payout(m: Marketplace, price: number) {
  return Math.max(0, price - m.fee(price));
}

function isFilled(item: Item, key: keyof Item) {
  const v = item[key];
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return v > 0;
  return Boolean(v);
}

export function missingFields(item: Item, m: Marketplace) {
  return m.required.filter((k) => !isFilled(item, k));
}

export const FIELD_LABELS: Partial<Record<keyof Item, string>> = {
  title: "Title",
  description: "Description",
  category: "Category",
  condition: "Condition",
  brand: "Brand",
  size: "Size",
  color: "Color",
  material: "Material",
  tags: "Tags",
  weightOz: "Package weight",
  lengthIn: "Package size",
};

/** The "add details later" checklist that drives the completeness meter. */
const DETAIL_FIELDS: (keyof Item)[] = [
  "brand",
  "size",
  "color",
  "material",
  "category",
  "tags",
  "weightOz",
  "lengthIn",
];

export function completeness(item: Item) {
  const checks = [...DETAIL_FIELDS.map((k) => isFilled(item, k)), item.photos.length >= 3];
  const done = checks.filter(Boolean).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: [
      ...DETAIL_FIELDS.filter((k) => !isFilled(item, k)).map((k) => FIELD_LABELS[k] ?? k),
      ...(item.photos.length < 3 ? ["3+ photos"] : []),
    ],
  };
}
