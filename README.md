# Crosslist

Snap a photo of an item, get a drafted title, description and price range, and list it on Depop, Poshmark, Vinted, Whatnot, eBay and Etsy at once. Add details later.

## Run it

```bash
npm install
cp .env.example .env.local   # add your Anthropic API key
npm run dev
```

Open http://localhost:3000. On a phone on the same Wi-Fi, use your computer's local IP so the **Take a photo** button opens the camera.

Without `ANTHROPIC_API_KEY`, the app still works, but uses sample text and prices in place of photo analysis.

## How it works

- **`/new`**: take a photo, then `/api/analyze` sends up to 4 photos to Claude (`claude-opus-5-5`) and gets back a title, details, description and low/recommended/high prices. Review and tap **List**.
- **`/items/[id]`**: fill in brand, size, tags and shipping whenever you want. Each marketplace shows its estimated fees and payout, any fields it still needs, and an optional price override. **Mark sold** pulls the listing from every other marketplace.
- **`/`**: inventory with live, draft and sold filters.

## Current limits

- **Publishing is simulated.** `lib/publish.ts` fakes each marketplace call. eBay (Sell API) and Etsy (Open API) have official listing APIs. Depop, Poshmark, Vinted and Whatnot don't offer public listing APIs, so they need partner access or browser automation.
- **Data stays in this browser** (IndexedDB). Nothing syncs between devices yet.
- **Fees are estimates** of US seller rates, not quotes.
- **Prices are the model's estimate** from the photo, not live sold comps.
