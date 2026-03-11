import type { SiteAdapter } from './types';

// Selectors in priority order — may break on Reddit redesigns
const AUTHOR_SELECTORS = ['[data-testid="post_author_link"]', 'a[href*="/user/"]'];

function extractUsername(href: string): string | null {
  const match = href.match(/\/user\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function extractAuthorFromDoc(doc: Pick<Document, 'querySelector'>): string | null {
  for (const selector of AUTHOR_SELECTORS) {
    try {
      const el = doc.querySelector(selector) as HTMLAnchorElement | null;
      if (el?.href) {
        const username = extractUsername(el.href);
        if (username) return username;
      }
    } catch {
      console.warn(`[reddit adapter] selector failed: ${selector}`);
    }
  }
  return null;
}

export const redditAdapter: SiteAdapter = {
  matches(url: string): boolean {
    return /https?:\/\/(www\.)?reddit\.com/i.test(url);
  },

  async extractEntities(
    url: string,
    document: Pick<Document, 'querySelector'>,
  ): Promise<string[]> {
    const entities: string[] = [];

    // Parse subreddit from URL
    const subredditMatch = url.match(/\/r\/([^/?#]+)/i);
    const isPostPage = url.includes('/comments/');

    if (isPostPage && subredditMatch) {
      // Try to extract author from DOM
      const username = extractAuthorFromDoc(document);
      if (username) {
        entities.push(`reddit.com/user/${username}`);
      }
    }

    if (subredditMatch) {
      // Preserve subreddit name case (Reddit URLs are case-insensitive but display names use original case)
      entities.push(`reddit.com/r/${subredditMatch[1]}`);
    }

    entities.push('reddit.com');

    return entities;
  },
};
