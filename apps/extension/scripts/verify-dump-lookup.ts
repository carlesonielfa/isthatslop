// Requires bun run dev (or the server) to be running on port 3000.
// Run with: bun apps/extension/scripts/verify-dump-lookup.ts

const DUMP_URL = "http://localhost:3000/api/v1/dump";

const res = await fetch(DUMP_URL);

if (res.status !== 200) {
  throw new Error(`TEST FAILED: Expected status 200, got ${res.status}`);
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
  entries: Array<{ url: string; tier: number }>;
};

console.log(`Dump fetched: ${count} entries (generatedAt: ${generatedAt})`);

if (!Array.isArray(entries)) {
  throw new Error("TEST FAILED: entries is not an array");
}

const target = entries.find((e) => e.url === "reddit.com/r/MachineLearning");

if (!target) {
  process.exit(1);
  throw new Error(
    `TEST FAILED: reddit.com/r/MachineLearning not found in dump entries`,
  );
}

console.log(
  `PASS: reddit.com/r/MachineLearning -> tier ${target.tier}`,
);
