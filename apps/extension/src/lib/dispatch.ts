export type GetTierFn = (url: string) => Promise<number | null>;
export type SetIconFn = (tier: number | null) => void;

export function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export interface SiteAdapter {
  matches(url: string): boolean;
  extractEntities(
    url: string,
    document: Pick<Document, "querySelector">,
  ): Promise<string[]>;
}

export function buildUrlHierarchy(url: string): string[] {
  const normalized = normalizeUrl(url);
  const slashIdx = normalized.indexOf("/");
  if (slashIdx === -1) return [normalized]; // already just a domain
  const domain = normalized.slice(0, slashIdx);
  if (domain === normalized) return [normalized];
  return [normalized, domain];
}

export async function checkAndUpdateIcon(
  url: string,
  doc: Pick<Document, "querySelector">,
  adapters: SiteAdapter[],
  getTier: GetTierFn,
  setIcon: SetIconFn,
): Promise<void> {
  const adapter = adapters.find((a) => a.matches(url));
  const adapterEntities = adapter
    ? await adapter.extractEntities(url, doc)
    : [];
  const urlHierarchy = buildUrlHierarchy(url);

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const u of [...adapterEntities, ...urlHierarchy]) {
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }

  let tier: number | null = null;
  for (const candidateUrl of urls) {
    const result = await getTier(candidateUrl);
    if (result !== null) {
      tier = result;
      break;
    }
  }

  setIcon(tier);
}
