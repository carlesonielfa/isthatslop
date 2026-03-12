import { describe, it, expect, mock } from "bun:test";
import {
  checkAndUpdateIcon,
  normalizeUrl,
  buildUrlHierarchy,
} from "../lib/dispatch";

// Minimal document stub for tests (Bun doesn't provide DOM globals)
const mockDoc = { querySelector: () => null } as Pick<
  Document,
  "querySelector"
>;

describe("normalizeUrl", () => {
  it("strips scheme, www, trailing slash, and lowercases", () => {
    expect(normalizeUrl("https://Reddit.com/r/ML/")).toBe("reddit.com/r/ml");
    expect(normalizeUrl("http://example.com")).toBe("example.com");
    expect(normalizeUrl("https://www.reddit.com/r/Art/")).toBe(
      "reddit.com/r/art",
    );
    expect(normalizeUrl("http://www.example.com/path")).toBe(
      "example.com/path",
    );
  });
});

describe("buildUrlHierarchy", () => {
  it("returns [normalized] for root domain URLs", () => {
    expect(buildUrlHierarchy("https://example.com")).toEqual(["example.com"]);
    expect(buildUrlHierarchy("https://www.example.com/")).toEqual([
      "example.com",
    ]);
  });

  it("returns [path, domain] for path URLs", () => {
    expect(buildUrlHierarchy("https://reddit.com/r/Art/")).toEqual([
      "reddit.com/r/art",
      "reddit.com",
    ]);
    expect(buildUrlHierarchy("https://www.youtube.com/watch?v=123")).toEqual([
      "youtube.com/watch?v=123",
      "youtube.com",
    ]);
  });
});

describe("checkAndUpdateIcon dispatch", () => {
  it("falls back to root domain when specific URL has no match", async () => {
    const getTier = mock(async (url: string) =>
      url === "reddit.com" ? 2 : null,
    );
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://www.reddit.com/r/unrated/",
      mockDoc,
      [],
      getTier,
      setIcon,
    );
    expect(getTier).toHaveBeenCalledWith("reddit.com/r/unrated");
    expect(getTier).toHaveBeenCalledWith("reddit.com");
    expect(setIcon).toHaveBeenCalledWith(2);
  });

  it("uses exact URL match before falling back to domain", async () => {
    const getTier = mock(async (url: string) =>
      url === "reddit.com/r/art" ? 1 : 3,
    );
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://reddit.com/r/Art/",
      mockDoc,
      [],
      getTier,
      setIcon,
    );
    expect(getTier).toHaveBeenCalledTimes(1);
    expect(setIcon).toHaveBeenCalledWith(1);
  });

  it("uses plain URL when no adapter matches", async () => {
    const getTier = mock(async (_url: string) => null);
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://example.com/",
      mockDoc,
      [],
      getTier,
      setIcon,
    );
    expect(getTier).toHaveBeenCalledWith("example.com");
    expect(setIcon).toHaveBeenCalledWith(null);
  });

  it("uses adapter entities when adapter matches, merged with buildUrlHierarchy", async () => {
    // Adapter returns only specific entity (no domain) — dispatch appends buildUrlHierarchy
    const adapter = {
      matches: (_url: string) => true,
      extractEntities: async (
        _url: string,
        _doc: Pick<Document, "querySelector">,
      ) => ["entity.com/specific"],
    };
    const getTier = mock(async (url: string) =>
      url === "entity.com/specific" ? 2 : null,
    );
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://entity.com/specific",
      mockDoc,
      [adapter],
      getTier,
      setIcon,
    );
    // entity.com/specific found first — stops early
    expect(setIcon).toHaveBeenCalledWith(2);
  });

  it("walks hierarchy and stops at first cache hit", async () => {
    // Adapter returns ["miss.com/section"] (no domain); dispatch merges with
    // buildUrlHierarchy("https://miss.com/page") = ["miss.com/page", "miss.com"]
    // merged = ["miss.com/section", "miss.com/page", "miss.com"]
    const adapter = {
      matches: () => true,
      extractEntities: async () => ["miss.com/section"],
    };
    const getTier = mock(async (url: string) =>
      url === "miss.com/section" ? 1 : null,
    );
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://miss.com/page",
      mockDoc,
      [adapter],
      getTier,
      setIcon,
    );
    expect(getTier).toHaveBeenCalledTimes(1); // miss.com/section hit on first try
    expect(setIcon).toHaveBeenCalledWith(1);
  });

  it("sends null when nothing in hierarchy matches cache", async () => {
    // Adapter returns ["miss.com/a"] (no domain); merged = ["miss.com/a", "miss.com/a" (deduped), "miss.com"]
    // Actually for URL "https://miss.com/a": buildUrlHierarchy = ["miss.com/a", "miss.com"]
    // adapter returns ["miss.com/a"]; merged deduped = ["miss.com/a", "miss.com"]
    const adapter = {
      matches: () => true,
      extractEntities: async () => ["miss.com/a"],
    };
    const getTier = mock(async (_url: string) => null);
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://miss.com/a",
      mockDoc,
      [adapter],
      getTier,
      setIcon,
    );
    expect(setIcon).toHaveBeenCalledWith(null);
  });

  it("deduplicates when adapter entity already present in buildUrlHierarchy", async () => {
    // Adapter returns entity that matches the normalized URL from buildUrlHierarchy
    // buildUrlHierarchy("https://entity.com/page") = ["entity.com/page", "entity.com"]
    // adapter returns ["entity.com/page", "entity.com/extra"]
    // merged deduped = ["entity.com/page", "entity.com/extra", "entity.com"]
    const adapter = {
      matches: () => true,
      extractEntities: async () => ["entity.com/page", "entity.com/extra"],
    };
    const getTier = mock(async (_url: string) => null);
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      "https://entity.com/page",
      mockDoc,
      [adapter],
      getTier,
      setIcon,
    );
    // "entity.com/page" only appears once in the call list
    const calls = getTier.mock.calls.map((c: [string]) => c[0]);
    expect(calls.filter((u: string) => u === "entity.com/page")).toHaveLength(
      1,
    );
    expect(calls).toEqual([
      "entity.com/page",
      "entity.com/extra",
      "entity.com",
    ]);
  });
});
