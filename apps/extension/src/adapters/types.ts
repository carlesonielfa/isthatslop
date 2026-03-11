// SiteAdapter interface — adapters extract prioritized entity URLs from a page
// Most specific entity first (e.g. reddit user > subreddit > site)
// All returned URLs are normalized: no scheme prefix, lowercase, no trailing slash

export interface SiteAdapter {
  matches(url: string): boolean;
  extractEntities(
    url: string,
    document: Pick<Document, "querySelector">,
  ): Promise<string[]>;
}
