"use client";

import { updateItem } from "./store";
import type { Item, MarketplaceId } from "./types";

// Demo publisher. None of these marketplaces is called yet: each enabled
// listing flips to "publishing", then to "live" after a short delay. Swap the
// body of `pushToMarketplace` for real API calls (eBay Sell API, Etsy Open API)
// or a browser-automation worker for sites without a public listing API.
async function pushToMarketplace() {
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 1400));
}

export async function publish(item: Item) {
  const targets = (Object.keys(item.marketplaces) as MarketplaceId[]).filter(
    (m) => item.marketplaces[m].enabled && item.marketplaces[m].status !== "live",
  );
  await updateItem(item.id, (i) => {
    const marketplaces = { ...i.marketplaces };
    for (const m of targets) marketplaces[m] = { ...marketplaces[m], status: "publishing" };
    return { ...i, marketplaces };
  });
  await Promise.all(
    targets.map(async (m) => {
      await pushToMarketplace();
      await updateItem(item.id, (i) => ({
        ...i,
        marketplaces: {
          ...i.marketplaces,
          [m]: { ...i.marketplaces[m], status: "live", publishedAt: Date.now() },
        },
      }));
    }),
  );
}

/** Mark sold on one marketplace and pull the listing everywhere else. */
export async function markSold(id: string, soldOn: MarketplaceId, price: number) {
  await updateItem(id, (i) => {
    const marketplaces = { ...i.marketplaces };
    for (const m of Object.keys(marketplaces) as MarketplaceId[]) {
      const l = marketplaces[m];
      if (m === soldOn) marketplaces[m] = { ...l, status: "sold" };
      else if (l.status === "live" || l.status === "publishing")
        marketplaces[m] = { ...l, status: "delisted" };
    }
    return { ...i, marketplaces, sold: { marketplace: soldOn, price, at: Date.now() } };
  });
}
