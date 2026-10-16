"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketplaceDots, money } from "@/components/ui";
import { completeness } from "@/lib/marketplaces";
import { useItems } from "@/lib/store";
import type { Item } from "@/lib/types";

type Filter = "all" | "live" | "draft" | "sold";

function stateOf(item: Item): Exclude<Filter, "all"> {
  if (item.sold) return "sold";
  return Object.values(item.marketplaces).some((l) => l.status === "live" || l.status === "publishing")
    ? "live"
    : "draft";
}

export default function InventoryPage() {
  const items = useItems();
  const [filter, setFilter] = useState<Filter>("all");

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-16 pb-24 sm:px-8 sm:pt-24">
        <p className="eyebrow">Depop · Poshmark · Vinted · Whatnot · eBay · Etsy</p>
        <h1 className="mt-4 max-w-2xl text-[2.75rem] leading-[1] font-medium tracking-[-0.03em] sm:text-[4rem]">
          One photo. Six marketplaces.
        </h1>
        <p className="mt-5 max-w-lg text-lg text-hushed">
          Snap your item, take the suggested price and description, and list it everywhere in under a minute.
          When it sells, it comes down from the rest.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/new" className="btn btn-accent h-12 px-6 text-base">
            List your first item →
          </Link>
        </div>
        <ol className="mt-16 grid border-t border-rule sm:grid-cols-3">
          {[
            ["01", "Snap", "Take a photo or pick a few from your library."],
            ["02", "Review", "Title, description and a price range are drafted for you."],
            ["03", "List", "Publish to every marketplace at once. Add details later."],
          ].map(([n, t, d]) => (
            <li key={n} className="border-b border-rule py-6 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0">
              <span className="font-mono text-xs text-hushed">{n}</span>
              <h3 className="mt-2 text-xl font-medium tracking-[-0.01em]">{t}</h3>
              <p className="mt-1 text-sm text-hushed">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const counts = {
    all: items.length,
    live: items.filter((i) => stateOf(i) === "live").length,
    draft: items.filter((i) => stateOf(i) === "draft").length,
    sold: items.filter((i) => stateOf(i) === "sold").length,
  };
  const listedValue = items
    .filter((i) => stateOf(i) === "live")
    .reduce((sum, i) => sum + i.price, 0);
  const soldValue = items.reduce((sum, i) => sum + (i.sold?.price ?? 0), 0);
  const shown = filter === "all" ? items : items.filter((i) => stateOf(i) === filter);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-24 sm:px-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[2rem] leading-none font-medium tracking-[-0.03em] sm:text-[2.5rem]">Inventory</h1>
        <Link href="/new" className="btn btn-accent hidden sm:inline-flex">
          Snap a new item
        </Link>
      </div>

      <dl className="mt-8 grid grid-cols-2 border border-rule bg-card sm:grid-cols-4">
        {[
          ["Live", counts.live],
          ["Drafts", counts.draft],
          ["Listed value", money(listedValue)],
          ["Sold", money(soldValue)],
        ].map(([label, value], i) => (
          <div
            key={label}
            className={`px-4 py-4 ${i % 2 ? "border-l border-rule" : ""} ${i > 1 ? "border-t border-rule sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}
          >
            <dt className="eyebrow !text-[10px]">{label}</dt>
            <dd className="mt-1 text-2xl font-medium tracking-[-0.02em]">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex gap-1 border-b border-rule" role="tablist">
        {(["all", "live", "draft", "sold"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${
              filter === f ? "border-ink-black text-ink" : "border-transparent text-hushed hover:text-ink"
            }`}
          >
            {f === "draft" ? "Drafts" : f} <span className="font-mono text-xs text-faint">{counts[f]}</span>
          </button>
        ))}
      </div>

      <ul className="divide-y divide-rule">
        {shown.map((item) => {
          const c = completeness(item);
          return (
            <li key={item.id}>
              <Link href={`/items/${item.id}`} className="flex items-center gap-4 py-4 hover:bg-card/60">
                <div className="size-16 shrink-0 border border-rule bg-sand">
                  {item.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element -- local data URL
                    <img src={item.photos[0]} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title || "Untitled item"}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <MarketplaceDots item={item} />
                    {!item.sold && c.percent < 100 && (
                      <span className="eyebrow !text-[10px]">Details {c.percent}%</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{money(item.sold?.price ?? item.price)}</p>
                  <p className="eyebrow mt-1 !text-[10px]">{stateOf(item)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="py-10 text-center text-hushed">Nothing here yet.</p>}

      <Link href="/new" className="btn btn-accent fixed right-4 bottom-4 h-14 px-6 shadow-[0_8px_24px_#0000001f] sm:hidden">
        Snap a new item
      </Link>
    </div>
  );
}
