# Extension Architecture: Two-Layer Lookup

This document explains how the IsThatSlop browser extension detects source tiers and how to add a new site adapter.

## Architecture Overview

The extension uses two independent layers:

**Layer 1 — Universal dump cache check (no adapter needed)**
The background service worker refreshes a local cache of all scored sources every 24 hours. On every page load, the content script looks up the current URL in that cache and updates the icon color. This works for _any_ URL in the database — no adapter required.

**Layer 2 — Adapter enrichment (optional, per-site)**
A `SiteAdapter` adds richer lookups by extracting multiple named entities from a page. For example, a Reddit post has an author (`reddit.com/user/alice`) and a subreddit (`reddit.com/r/MachineLearning`) — both of which might be scored separately. The adapter returns these as a priority-ordered list; the content script walks the list and stops at the first cache hit.

> **Key point:** Adapters do NOT gate basic tier detection. Every URL is checked against the cache. Adapters only add entity extraction on sites where plain URL matching is insufficient.

---

## How the Lookup Works

On every page load or SPA navigation:

1. Content script calls `checkAndUpdateIcon(url, document, registry, getTier, setIcon)`
2. The registry is walked — the first adapter where `adapter.matches(url) === true` is selected
3. **No adapter match:** entity list = `buildUrlHierarchy(url)` (normalized URL + domain)
4. **Adapter match:** entity list = adapter entities (most specific first) + `buildUrlHierarchy(url)` appended and deduped
5. Content script walks the entity list, calls `GET_TIER` for each URL, stops at first non-null result
6. Calls `SET_ICON` with the tier (or `null` for neutral/grey)

### Example: Reddit post by a scored author

```
URL: https://reddit.com/r/MachineLearning/comments/abc123/title/
Adapter: RedditAdapter.matches("reddit.com/...") → true
extractEntities → [
  "reddit.com/user/some_author",   // most specific — check first
  "reddit.com/r/machinelearning",  // subreddit fallback
]
dispatch appends buildUrlHierarchy → [
  "reddit.com/r/machinelearning/comments/abc123/title",  // normalized page URL
  "reddit.com"                                           // domain fallback
]
final entity list → [
  "reddit.com/user/some_author",
  "reddit.com/r/machinelearning",
  "reddit.com/r/machinelearning/comments/abc123/title",
  "reddit.com"
]
Cache lookup:
  reddit.com/user/some_author → null (not scored)
  reddit.com/r/machinelearning → 3   ← hit! stop here
SET_ICON(3) → orange icon
```

---

## SiteAdapter Interface

```typescript
// apps/extension/src/adapters/types.ts
export interface SiteAdapter {
  matches(url: string): boolean;
  extractEntities(
    url: string,
    document: Pick<Document, "querySelector">,
  ): Promise<string[]>;
}
```

**`matches(url)`**
Return `true` for every URL this adapter should enrich. The URL is the raw `location.href` — not yet normalized.

**`extractEntities(url, document)`**
Return a priority-ordered array of normalized URLs (no scheme, lowercase, no trailing slash). Most specific first. The method is async because SPA pages may need DOM polling before author metadata renders.

**Normalization convention:**

```
https://Reddit.com/r/ML/  →  reddit.com/r/ml
http://example.com        →  example.com
```

---

## Adding a New Adapter

### Step 1: Create the adapter file

```typescript
// apps/extension/src/adapters/example.ts
import type { SiteAdapter } from "./types";

export const exampleAdapter: SiteAdapter = {
  matches(url: string): boolean {
    return url.includes("example.com");
  },

  async extractEntities(
    url: string,
    document: Pick<Document, "querySelector">,
  ): Promise<string[]> {
    // Extract normalized entities from most specific to least specific
    const authorEl = document.querySelector("[data-author]");
    const author = authorEl?.getAttribute("data-author");

    const entities: string[] = [];
    if (author) entities.push(`example.com/user/${author.toLowerCase()}`);
    // No need to push the site domain — dispatch appends buildUrlHierarchy() automatically
    return entities;
  },
};
```

### Step 2: Add tests

```typescript
// apps/extension/src/__tests__/adapters.test.ts
import { exampleAdapter } from "../adapters/example";

describe("exampleAdapter", () => {
  it("matches example.com URLs", () => {
    expect(exampleAdapter.matches("https://example.com/post/123")).toBe(true);
    expect(exampleAdapter.matches("https://other.com")).toBe(false);
  });

  it("extracts author and site fallback", async () => {
    const doc = {
      querySelector: (sel: string) =>
        sel === "[data-author]" ? { getAttribute: () => "Alice" } : null,
    } as unknown as Pick<Document, "querySelector">;

    const entities = await exampleAdapter.extractEntities(
      "https://example.com/post/1",
      doc,
    );
    expect(entities).toEqual(["example.com/user/alice"]);
  });
});
```

### Step 3: Register the adapter

```typescript
// apps/extension/src/adapters/registry.ts
import { exampleAdapter } from "./example";

export const registry: SiteAdapter[] = [
  redditAdapter,
  youtubeAdapter,
  exampleAdapter,
];
```

### Step 4: Verify

```bash
bun test apps/extension/src/__tests__/adapters.test.ts
```

---

## Built-in Adapters

### Reddit (`apps/extension/src/adapters/reddit.ts`)

Matches: `reddit.com`

Entity extraction:

- **Post page** (`/comments/`): extracts post author from DOM → returns `[reddit.com/user/{author}, reddit.com/r/{sub}]`
- **Subreddit page** (`/r/`): returns `[reddit.com/r/{sub}]`
- **Other**: returns `[]` (dispatch falls back to `buildUrlHierarchy`)

### YouTube (`apps/extension/src/adapters/youtube.ts`)

Matches: `youtube.com`, `youtu.be`

Entity extraction:

- **Video page** (`/watch`): polls DOM for channel link → returns `[youtube.com/c/{channel}]`
- **Channel page** (`/@` or `/channel/`): extracts from URL → returns `[youtube.com/@{handle}]`
- **Other**: returns `[]` (dispatch falls back to `buildUrlHierarchy`)

---

## Selector Stability Note

Reddit and YouTube DOM selectors are **low confidence**. Reddit redesigns frequently; YouTube uses custom elements with unstable attribute names.

If an adapter returns only the top-level site URL on every page, the selectors likely need updating. Test selectors against the current DOM before deploying changes.

To debug adapter output, open the browser console on the target page and run:

```javascript
// Check what entities the content script would extract
document.querySelector("[data-author]"); // Reddit author example
document.querySelector("ytd-channel-name a"); // YouTube channel example
```
