"use client";

import { del, get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import { MARKETPLACES } from "./marketplaces";
import type { Item, MarketplaceId, MarketplaceListing } from "./types";

// Items live in this browser's IndexedDB: photos are too large for localStorage.
const KEY = "crosslist:items";
const EVENT = "crosslist:changed";

async function readAll(): Promise<Item[]> {
  return (await get<Item[]>(KEY)) ?? [];
}

async function writeAll(items: Item[]) {
  await set(KEY, items);
  window.dispatchEvent(new Event(EVENT));
}

export async function getItem(id: string) {
  return (await readAll()).find((i) => i.id === id);
}

// Every write is a read-modify-write of the whole list, so run them one at a
// time; otherwise parallel publish updates would overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function put(item: Item) {
  const items = await readAll();
  const next = { ...item, updatedAt: Date.now() };
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx === -1) items.unshift(next);
  else items[idx] = next;
  await writeAll(items);
  return next;
}

export function saveItem(item: Item) {
  return serial(() => put(item));
}

/** Merge changes into the latest stored copy, so concurrent publish updates aren't lost. */
export function updateItem(id: string, change: Partial<Item> | ((item: Item) => Item)) {
  return serial(async () => {
    const current = await getItem(id);
    if (!current) return;
    return put(typeof change === "function" ? change(current) : { ...current, ...change });
  });
}

export function deleteItem(id: string) {
  return serial(async () => {
    const items = (await readAll()).filter((i) => i.id !== id);
    if (items.length) await writeAll(items);
    else {
      await del(KEY);
      window.dispatchEvent(new Event(EVENT));
    }
  });
}

export function useItems() {
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(() => {
    readAll().then(setItems);
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [load]);
  return items;
}

export function useItem(id: string) {
  const items = useItems();
  if (items === null) return undefined;
  return items.find((i) => i.id === id) ?? null;
}

export function newItem(): Item {
  const now = Date.now();
  const id = crypto.randomUUID();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    photos: [],
    title: "",
    description: "",
    price: 0,
    category: "",
    brand: "",
    size: "",
    color: "",
    material: "",
    condition: "good",
    tags: [],
    quantity: 1,
    sku: id.slice(0, 8).toUpperCase(),
    marketplaces: Object.fromEntries(
      MARKETPLACES.map((m) => [m.id, { enabled: m.id !== "etsy", status: "off" }]),
    ) as Record<MarketplaceId, MarketplaceListing>,
  };
}
