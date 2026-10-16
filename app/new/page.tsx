"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ConditionPicker,
  MarketplaceToggle,
  PhotoInput,
  PhotoStrip,
  PricePicker,
  Section,
} from "@/components/ui";
import type { AnalyzeResponse } from "@/lib/analysis";
import { MARKETPLACES } from "@/lib/marketplaces";
import { publish } from "@/lib/publish";
import { newItem, saveItem } from "@/lib/store";
import type { Item } from "@/lib/types";

type Stage = "capture" | "analyzing" | "review";

export default function NewListingPage() {
  const router = useRouter();
  // Created on the first photo, not during render: ids and timestamps must not be prerendered.
  const [item, setItem] = useState<Item | null>(null);
  const [stage, setStage] = useState<Stage>("capture");
  const [notice, setNotice] = useState<string>();
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<Item>) => setItem((i) => (i ? { ...i, ...p } : i));

  async function analyze(photos: string[]) {
    setItem((i) => ({ ...(i ?? newItem()), photos }));
    setStage("analyzing");
    setNotice(undefined);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      const body = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) throw new Error(body.error);
      const a = body.analysis;
      patch({
        title: a.title,
        brand: a.brand,
        category: a.category,
        size: a.size,
        color: a.color,
        material: a.material,
        condition: a.condition,
        description: a.description,
        tags: a.tags,
        price: a.price.mid,
        priceSuggestion: a.price,
        demoAnalysis: body.demo,
      });
      setNotice(body.notice);
    } catch (err) {
      setNotice(err instanceof Error && err.message ? err.message : "Couldn't analyze the photo.");
    }
    setStage("review");
  }

  async function finish(listNow: boolean) {
    if (!item) return;
    setSaving(true);
    const saved = await saveItem(item);
    if (listNow) void publish(saved);
    router.push(`/items/${saved.id}${listNow ? "?listed=1" : ""}`);
  }

  if (stage === "capture" || !item) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16 sm:pt-16">
        <p className="eyebrow">Step 1 of 2</p>
        <h1 className="mt-3 text-[2.5rem] leading-[1] font-medium tracking-[-0.03em] sm:text-[3.25rem]">
          Snap it.
          <br />
          List it everywhere.
        </h1>
        <p className="mt-4 max-w-md text-hushed">
          Take a photo and we&apos;ll draft the title, description and price. Add more details whenever you like.
        </p>
        <PhotoInput
          onAdd={analyze}
          className="group mt-8 flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 border border-ink-black bg-card transition-colors hover:bg-sand"
        >
          <span className="grid size-16 place-items-center bg-solar transition-transform group-hover:scale-105">
            <CameraIcon />
          </span>
          <span className="text-lg font-medium">Take a photo</span>
          <span className="eyebrow">Front, back, tag — up to 4 help most</span>
        </PhotoInput>
        <PhotoInput onAdd={analyze} camera={false} className="btn btn-ghost mt-3 w-full">
          Choose from library
        </PhotoInput>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16 sm:pt-16">
        <p className="eyebrow">Reading your photo</p>
        <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden border border-rule bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img src={item.photos[0]} alt="" className="size-full object-cover opacity-80" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-ink-black px-4 py-3 text-white">
            <span className="size-2 animate-pulse-dot bg-solar" />
            <span className="text-sm">Drafting title, description and prices…</span>
          </div>
        </div>
        <div className="mt-6 space-y-3" aria-hidden>
          <div className="h-11 w-full animate-pulse bg-sand" />
          <div className="h-20 w-full animate-pulse bg-sand" />
          <div className="h-32 w-full animate-pulse bg-sand" />
        </div>
      </div>
    );
  }

  const enabled = MARKETPLACES.filter((m) => item.marketplaces[m.id].enabled);
  const detected = [item.brand, item.size, item.color, item.material].filter(Boolean);
  const titleLimit = 80;

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-36 sm:pt-12">
      <p className="eyebrow">Step 2 of 2 · Review</p>
      <h1 className="mt-2 text-[1.75rem] leading-tight font-medium tracking-[-0.02em]">Looks right?</h1>

      {notice && (
        <p className="mt-4 border-l-2 border-solar bg-card px-3 py-2 text-sm text-hushed">{notice}</p>
      )}

      <div className="mt-6 space-y-8">
        <PhotoStrip photos={item.photos} onChange={(photos) => patch({ photos })} />

        <Section
          label="Title"
          hint={
            <span className={item.title.length > titleLimit ? "text-danger" : ""}>
              {item.title.length}/{titleLimit}
            </span>
          }
        >
          <input
            className="field text-base font-medium"
            value={item.title}
            placeholder="Brand, item, color, size"
            onChange={(e) => patch({ title: e.target.value })}
          />
          {detected.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="eyebrow mr-1 !text-[10px]">Detected</span>
              {detected.map((d) => (
                <span key={d} className="bg-sand px-2 py-0.5 text-xs">
                  {d}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section label="Price" hint={item.priceSuggestion && !item.demoAnalysis ? "AI estimate" : undefined}>
          <PricePicker
            value={item.price}
            suggestion={item.priceSuggestion}
            onChange={(price) => patch({ price })}
          />
        </Section>

        <Section label="Condition">
          <ConditionPicker value={item.condition} onChange={(condition) => patch({ condition })} />
        </Section>

        <Section label="Description" hint="Prefilled — edit freely">
          <textarea
            className="field min-h-44 leading-relaxed"
            value={item.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Section>

        <Section label="List on" hint={`${enabled.length} of ${MARKETPLACES.length} selected`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {MARKETPLACES.map((m) => (
              <MarketplaceToggle
                key={m.id}
                marketplace={m}
                enabled={item.marketplaces[m.id].enabled}
                price={item.price}
                onToggle={() =>
                  patch({
                    marketplaces: {
                      ...item.marketplaces,
                      [m.id]: { ...item.marketplaces[m.id], enabled: !item.marketplaces[m.id].enabled },
                    },
                  })
                }
              />
            ))}
          </div>
          <p className="text-xs text-hushed">
            Etsy is off by default: it only accepts handmade, vintage (20+ years) or craft supplies.
          </p>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">
          <button className="btn btn-ghost" disabled={saving} onClick={() => finish(false)}>
            Save draft
          </button>
          <button
            className="btn btn-primary flex-1"
            disabled={saving || !item.title.trim() || item.price <= 0 || enabled.length === 0}
            onClick={() => finish(true)}
          >
            List on {enabled.length} {enabled.length === 1 ? "marketplace" : "marketplaces"}
            <span aria-hidden className="text-solar">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 8h3.5l1.5-2.5h8L17.5 8H21v11H3z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
