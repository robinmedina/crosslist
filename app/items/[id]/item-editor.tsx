"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import {
  ConditionPicker,
  MarketplaceToggle,
  PhotoStrip,
  PricePicker,
  Section,
  money,
} from "@/components/ui";
import { FIELD_LABELS, MARKETPLACES, completeness, missingFields } from "@/lib/marketplaces";
import { markSold, publish } from "@/lib/publish";
import { deleteItem, updateItem, useItem } from "@/lib/store";
import type { Item, MarketplaceId } from "@/lib/types";

export function ItemEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const stored = useItem(id);
  const router = useRouter();
  const justListed = useSearchParams().get("listed") === "1";

  // Field edits are held locally and flushed after a pause, merged into the
  // stored copy so marketplace status updates from publishing aren't clobbered.
  const [edits, setEdits] = useState<Partial<Item>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Partial<Item>>({});

  useEffect(() => () => {
    clearTimeout(timer.current);
    if (Object.keys(pending.current).length) void updateItem(id, pending.current);
  }, [id]);

  if (stored === undefined) return null;
  if (stored === null) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <p className="text-hushed">This item doesn&apos;t exist on this device.</p>
        <Link href="/" className="btn btn-ghost mt-4">
          Back to inventory
        </Link>
      </div>
    );
  }

  const item: Item = { ...stored, ...edits };

  function patch(p: Partial<Item>) {
    setEdits((e) => ({ ...e, ...p }));
    pending.current = { ...pending.current, ...p };
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const flushed = pending.current;
      pending.current = {};
      await updateItem(id, flushed);
      setEdits((e) => {
        const rest = { ...e };
        for (const k of Object.keys(flushed) as (keyof Item)[]) if (rest[k] === flushed[k]) delete rest[k];
        return rest;
      });
    }, 400);
  }

  function setListing(m: MarketplaceId, change: Partial<Item["marketplaces"][MarketplaceId]>) {
    void updateItem(id, (i) => ({
      ...i,
      marketplaces: { ...i.marketplaces, [m]: { ...i.marketplaces[m], ...change } },
    }));
  }

  async function publishNow() {
    clearTimeout(timer.current);
    const flushed = pending.current;
    pending.current = {};
    const latest = await updateItem(id, flushed);
    setEdits({});
    if (latest) await publish(latest);
  }

  const c = completeness(item);
  const listings = MARKETPLACES.map((m) => ({ m, l: item.marketplaces[m.id] }));
  const live = listings.filter(({ l }) => l.status === "live");
  const toPublish = listings.filter(({ l }) => l.enabled && (l.status === "off" || l.status === "delisted"));
  const publishing = listings.some(({ l }) => l.status === "publishing");

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-8 sm:pt-10">
      <Link href="/" className="eyebrow hover:text-ink">
        ← Inventory
      </Link>

      {justListed && !item.sold && (
        <div className="mt-4 flex items-start gap-3 bg-ink-black px-4 py-3 text-white">
          <span className={`mt-1.5 size-2 shrink-0 bg-solar ${publishing ? "animate-pulse-dot" : ""}`} />
          <p className="text-sm">
            {publishing
              ? "Publishing to your marketplaces…"
              : `Live on ${live.length} ${live.length === 1 ? "marketplace" : "marketplaces"}.`}{" "}
            <span className="text-white/60">
              Add brand, size and shipping details below whenever you have a minute. Fuller listings rank higher.
            </span>
          </p>
        </div>
      )}

      {item.sold && (
        <div className="mt-4 border border-ink-black bg-solar px-4 py-3 text-sm text-ink-black">
          Sold on {MARKETPLACES.find((m) => m.id === item.sold!.marketplace)?.name} for {money(item.sold.price)}.
          Removed from the other marketplaces.
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <h1 className="text-[1.75rem] leading-tight font-medium tracking-[-0.02em] sm:text-[2rem]">
            {item.title || "Untitled item"}
          </h1>

          <PhotoStrip photos={item.photos} onChange={(photos) => patch({ photos })} />

          <Section label="Title" hint={`${item.title.length}/80`}>
            <input className="field font-medium" value={item.title} onChange={(e) => patch({ title: e.target.value })} />
          </Section>

          <Section label="Price">
            <PricePicker value={item.price} suggestion={item.priceSuggestion} onChange={(price) => patch({ price })} />
          </Section>

          <Section label="Condition">
            <ConditionPicker value={item.condition} onChange={(condition) => patch({ condition })} />
          </Section>

          <Section label="Description">
            <textarea
              className="field min-h-48 leading-relaxed"
              value={item.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Section>

          <Section label="Details" hint="Most marketplaces search on these">
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Brand" value={item.brand} onChange={(brand) => patch({ brand })} />
              <Text label="Size" value={item.size} onChange={(size) => patch({ size })} />
              <Text label="Color" value={item.color} onChange={(color) => patch({ color })} />
              <Text label="Material" value={item.material} onChange={(material) => patch({ material })} />
              <div className="sm:col-span-2">
                <Text
                  label="Category"
                  value={item.category}
                  placeholder="Women > Tops > Blouses"
                  onChange={(category) => patch({ category })}
                />
              </div>
              <div className="sm:col-span-2">
                <TagsInput tags={item.tags} onChange={(tags) => patch({ tags })} />
              </div>
              <Text label="SKU" value={item.sku} onChange={(sku) => patch({ sku })} />
              <Num label="Quantity" value={item.quantity} onChange={(quantity) => patch({ quantity })} />
            </div>
          </Section>

          <Section label="Shipping" hint="Package, not item">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Num label="Weight (oz)" value={item.weightOz} onChange={(weightOz) => patch({ weightOz })} />
              <Num label="Length (in)" value={item.lengthIn} onChange={(lengthIn) => patch({ lengthIn })} />
              <Num label="Width (in)" value={item.widthIn} onChange={(widthIn) => patch({ widthIn })} />
              <Num label="Height (in)" value={item.heightIn} onChange={(heightIn) => patch({ heightIn })} />
            </div>
          </Section>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          {!item.sold && (
            <Section label="Listing details" hint={`${c.percent}%`}>
              <div className="h-1.5 w-full bg-sand">
                <div className="h-full bg-ink-black transition-all" style={{ width: `${c.percent}%` }} />
              </div>
              {c.missing.length > 0 ? (
                <p className="text-sm text-hushed">Still missing: {c.missing.join(", ")}.</p>
              ) : (
                <p className="text-sm text-hushed">Everything&apos;s filled in.</p>
              )}
            </Section>
          )}

          <Section label="Marketplaces" hint="Demo: listings are simulated">
            <div className="space-y-2">
              {listings.map(({ m, l }) => {
                const missing = missingFields(item, m);
                return (
                  <MarketplaceToggle
                    key={m.id}
                    marketplace={m}
                    enabled={l.enabled}
                    status={l.status}
                    price={l.price ?? item.price}
                    onToggle={() => setListing(m.id, { enabled: !l.enabled })}
                  >
                    {l.enabled && !item.sold && (
                      <div className="space-y-2 border-t border-rule px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3 text-xs text-hushed">
                          <span>Fees {m.feeNote}</span>
                          <label className="flex items-center gap-1">
                            <span>$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              aria-label={`${m.name} price`}
                              placeholder={String(item.price)}
                              value={l.price ?? ""}
                              onChange={(e) =>
                                setListing(m.id, { price: e.target.value ? Number(e.target.value) : undefined })
                              }
                              className="w-16 border border-rule bg-paper px-1.5 py-0.5 text-right text-ink outline-none focus:border-ink"
                            />
                          </label>
                        </div>
                        {missing.length > 0 && (
                          <p className="text-xs text-danger">
                            Needs {missing.map((k) => (FIELD_LABELS[k] ?? k).toLowerCase()).join(", ")}
                          </p>
                        )}
                        {m.note && <p className="text-xs text-hushed">{m.note}</p>}
                      </div>
                    )}
                  </MarketplaceToggle>
                );
              })}
            </div>
            {!item.sold && (
              <button
                className="btn btn-primary w-full"
                disabled={toPublish.length === 0 || publishing || !item.title.trim() || item.price <= 0}
                onClick={publishNow}
              >
                {publishing
                  ? "Publishing…"
                  : toPublish.length
                    ? `List on ${toPublish.length} more`
                    : "All selected marketplaces live"}
              </button>
            )}
          </Section>

          {!item.sold && live.length > 0 && <SoldForm item={item} />}

          <button
            className="text-sm text-hushed underline-offset-4 hover:text-danger hover:underline"
            onClick={async () => {
              if (!confirm("Delete this item? This removes it from this device.")) return;
              await deleteItem(id);
              router.push("/");
            }}
          >
            Delete item
          </button>
        </aside>
      </div>
    </div>
  );
}

function SoldForm({ item }: { item: Item }) {
  const live = MARKETPLACES.filter((m) => item.marketplaces[m.id].status === "live");
  const [where, setWhere] = useState<MarketplaceId>(live[0].id);
  const [price, setPrice] = useState(item.marketplaces[live[0].id].price ?? item.price);
  return (
    <Section label="Sold it?">
      <div className="space-y-2 border border-rule bg-card p-3">
        <div className="flex gap-2">
          <select
            className="field flex-1"
            value={where}
            onChange={(e) => setWhere(e.target.value as MarketplaceId)}
            aria-label="Sold on"
          >
            {live.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            className="field w-24"
            type="number"
            inputMode="decimal"
            aria-label="Sale price"
            value={price || ""}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <button className="btn btn-accent w-full" onClick={() => markSold(item.id, where, price)}>
          Mark sold & delist everywhere else
        </button>
      </div>
    </Section>
  );
}

function Text({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-hushed">{label}</span>
      <input className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Num({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-hushed">{label}</span>
      <input
        className="field"
        type="number"
        inputMode="decimal"
        min={0}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      />
    </label>
  );
}

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };
  return (
    <div className="space-y-1">
      <span className="text-sm text-hushed">Tags</span>
      <div className="field flex flex-wrap items-center gap-1.5 !py-2 focus-within:border-ink">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-sand px-2 py-0.5 text-sm">
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              className="text-hushed hover:text-ink"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent outline-none"
          value={draft}
          placeholder={tags.length ? "" : "vintage, y2k, denim"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={add}
        />
      </div>
    </div>
  );
}
