// Requires: bun run dev running on port 3000 with seeded data
// Run with: bun apps/extension/scripts/verify-dump-lookup.ts

import { createHash } from "crypto";

const DUMP_URL = "http://localhost:3000/api/v1/dump";

function normalizeUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

// Note: uses Node's createHash (not Web Crypto) since this runs in Bun/Node, not a browser
// service worker. Same SHA-256 algorithm, different API surface, identical output.
function computeUrlHash(url: string): string {
  return createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 16);
}

const res = await fetch(DUMP_URL);

if (!res.ok) {
  throw new Error(`TEST FAILED: Expected ok response, got ${res.status}`);
}

const body = (await res.json()) as unknown;

if (
  typeof body !== "object" ||
  body === null ||
  !("generatedAt" in body) ||
  !("count" in body) ||
  !("entries" in body)
) {
  throw new Error(
    "TEST FAILED: Response body missing required shape { generatedAt, count, entries }",
  );
}

const { generatedAt, count, entries } = body as {
  generatedAt: string;
  count: number;
  entries: Array<{ urlHash: string; tier: number }>;
};

console.log(`Dump fetched: ${count} entries (generatedAt: ${generatedAt})`);

if (!Array.isArray(entries)) {
  throw new Error("TEST FAILED: entries is not an array");
}

if (count !== entries.length) {
  throw new Error(
    `TEST FAILED: count mismatch — count=${count}, entries.length=${entries.length}`,
  );
}

// Build lookup map from urlHash -> tier
const scoreMap = new Map<string, number>();
for (const entry of entries) {
  scoreMap.set(entry.urlHash, entry.tier);
}

const testUrl = "reddit.com/r/MachineLearning";
const testHash = computeUrlHash(testUrl);
const tier = scoreMap.get(testHash);

if (tier !== undefined) {
  console.log(`PASS: ${testUrl} -> tier ${tier}`);
  process.exit(0);
} else {
  console.log(
    "Available hashes (first 5):",
    [...scoreMap.keys()].slice(0, 5),
  );
  throw new Error("TEST FAILED: hash not found");
}
