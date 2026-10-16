"use client";

import { useRef } from "react";
import { compressImage } from "@/lib/image";
import { MARKETPLACES, payout, type Marketplace } from "@/lib/marketplaces";
import { CONDITIONS, type Condition, type Item, type ListingStatus, type PriceSuggestion } from "@/lib/types";

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });

const STATUS_LABEL: Record<ListingStatus, string> = {
  off: "Off",
  publishing: "Publishing",
  live: "Live",
  sold: "Sold",
  delisted: "Delisted",
};

export function StatusPill({ status }: { status: ListingStatus }) {
  const tone =
    status === "live"
      ? "bg-live"
      : status === "sold"
        ? "bg-solar ring-1 ring-ink-black"
        : status === "publishing"
          ? "bg-ink animate-pulse-dot"
          : "bg-rule-strong";
  return (
    <span className="eyebrow inline-flex items-center gap-1.5 !text-[10px]">
      <span className={`size-1.5 rounded-full ${tone}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Compact row of marketplace initials, filled when live. */
export function MarketplaceDots({ item }: { item: Item }) {
  return (
    <div className="flex gap-1">
      {MARKETPLACES.filter((m) => item.marketplaces[m.id].enabled).map((m) => {
        const s = item.marketplaces[m.id].status;
        const live = s === "live" || s === "sold";
        return (
          <span
            key={m.id}
            title={`${m.name}: ${STATUS_LABEL[s]}`}
            className={`grid size-6 place-items-center font-mono text-[10px] font-medium ${
              live ? "text-white" : "border border-rule text-hushed"
            } ${s === "publishing" ? "animate-pulse-dot" : ""} ${s === "delisted" ? "line-through opacity-50" : ""}`}
            style={live ? { background: m.swatch } : undefined}
          >
            {m.name.slice(0, 2)}
          </span>
        );
      })}
    </div>
  );
}

export function PhotoInput({
  onAdd,
  children,
  className,
  camera = true,
}: {
  onAdd: (dataUrls: string[]) => void;
  children: React.ReactNode;
  className?: string;
  /** Open the rear camera directly on phones instead of the photo library. */
  camera?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture={camera ? "environment" : undefined}
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onAdd(await Promise.all(files.map((f) => compressImage(f))));
        }}
      />
    </>
  );
}

export function PhotoStrip({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((src, i) => (
        <div key={i} className="group relative size-20 shrink-0 border border-rule bg-sand sm:size-24">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URLs */}
          <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
          {i === 0 && (
            <span className="eyebrow absolute bottom-0 left-0 bg-ink-black px-1 !text-[9px] !text-white">Cover</span>
          )}
          <button
            type="button"
            aria-label={`Remove photo ${i + 1}`}
            onClick={() => onChange(photos.filter((_, j) => j !== i))}
            className="absolute top-0 right-0 grid size-6 place-items-center bg-ink-black/80 text-xs text-white sm:opacity-0 sm:group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
      <PhotoInput
        camera={false}
        onAdd={(added) => onChange([...photos, ...added])}
        className="grid size-20 shrink-0 place-items-center border border-dashed border-rule-strong text-hushed hover:border-ink hover:text-ink sm:size-24"
      >
        <span className="text-center text-xs leading-tight">
          <span className="block text-xl leading-none">+</span>
          Add photo
        </span>
      </PhotoInput>
    </div>
  );
}

export function PricePicker({
  value,
  suggestion,
  onChange,
}: {
  value: number;
  suggestion?: PriceSuggestion;
  onChange: (price: number) => void;
}) {
  const options = suggestion
    ? [
        { label: "Quick sale", price: suggestion.low },
        { label: "Recommended", price: suggestion.mid },
        { label: "Max value", price: suggestion.high },
      ]
    : [];
  return (
    <div className="space-y-3">
      {options.length > 0 && (
        <div className="grid grid-cols-3 border border-rule bg-card">
          {options.map((o, i) => {
            const active = value === o.price;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => onChange(o.price)}
                className={`px-3 py-3 text-left transition-colors ${i > 0 ? "border-l border-rule" : ""} ${
                  active ? "bg-ink-black text-white" : "hover:bg-sand"
                }`}
              >
                <span className={`eyebrow block !text-[10px] ${active ? "!text-white/70" : ""}`}>{o.label}</span>
                <span className="mt-1 block text-xl font-medium tracking-[-0.02em]">{money(o.price)}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="relative w-36">
          <span className="sr-only">Price</span>
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-hushed">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            value={value || ""}
            placeholder="0"
            onChange={(e) => onChange(Number(e.target.value))}
            className="field pl-7"
          />
        </label>
        {suggestion && <p className="text-sm text-hushed">{suggestion.rationale}</p>}
      </div>
    </div>
  );
}

export function ConditionPicker({ value, onChange }: { value: Condition; onChange: (c: Condition) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONDITIONS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`border px-3 py-1.5 text-sm transition-colors ${
            value === c.id ? "border-ink-black bg-ink-black text-white" : "border-rule bg-card hover:border-ink"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function MarketplaceToggle({
  marketplace: m,
  enabled,
  price,
  status,
  onToggle,
  children,
}: {
  marketplace: Marketplace;
  enabled: boolean;
  price: number;
  status?: ListingStatus;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const locked = status === "live" || status === "sold" || status === "publishing";
  return (
    <div className={`border bg-card transition-colors ${enabled ? "border-ink" : "border-rule"}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        aria-pressed={enabled}
        className="flex w-full items-center gap-3 px-3 py-3 text-left disabled:cursor-default"
      >
        <span
          aria-hidden
          className={`grid size-5 shrink-0 place-items-center border text-[11px] ${
            enabled ? "border-ink-black bg-ink-black text-solar" : "border-rule-strong"
          }`}
        >
          {enabled ? "✓" : ""}
        </span>
        <span className="size-2 shrink-0" style={{ background: m.swatch }} />
        <span className="flex-1 font-medium">{m.name}</span>
        {status && status !== "off" ? (
          <StatusPill status={status} />
        ) : (
          price > 0 && (
            <span className="text-right">
              <span className="block text-sm font-medium">{money(payout(m, price))}</span>
              <span className="eyebrow block !text-[9px]">est. payout</span>
            </span>
          )
        )}
      </button>
      {children}
    </div>
  );
}

export function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="eyebrow">{label}</h2>
        {hint && <span className="text-xs text-hushed">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
