import type { SiteAdapter } from './types';

// Selectors in priority order — may break on YouTube DOM updates
const CHANNEL_SELECTORS = ['ytd-channel-name a', '#channel-name a'];

// Poll for channel element up to 2s (10 × 200ms) — needed for SPA navigation
async function waitForChannelElement(
  doc: Pick<Document, 'querySelector'>,
  timeoutMs = 2000,
  intervalMs = 200,
): Promise<HTMLAnchorElement | null> {
  const maxAttempts = Math.ceil(timeoutMs / intervalMs);
  for (let i = 0; i < maxAttempts; i++) {
    for (const selector of CHANNEL_SELECTORS) {
      try {
        const el = doc.querySelector(selector) as HTMLAnchorElement | null;
        if (el?.href) return el;
      } catch {
        console.warn(`[youtube adapter] selector failed: ${selector}`);
      }
    }
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return null;
}

function normalizeChannelHref(href: string): string | null {
  // Extract path starting from /@ or /channel/ or /c/ — preserve original case for handle/ID
  const match = href.match(/youtube\.com(\/@[^/?#]+|\/channel\/[^/?#]+|\/c\/[^/?#]+)/i);
  if (!match) return null;
  return `youtube.com${match[1]}`;
}

export const youtubeAdapter: SiteAdapter = {
  matches(url: string): boolean {
    return /https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(url);
  },

  async extractEntities(
    url: string,
    document: Pick<Document, 'querySelector'>,
  ): Promise<string[]> {
    const entities: string[] = [];

    const isVideoPage = /youtube\.com\/watch\b/.test(url);
    const handleMatch = url.match(/youtube\.com(\/@[^/?#]+)/i);
    const channelIdMatch = url.match(/youtube\.com(\/channel\/[^/?#]+)/i);

    if (isVideoPage) {
      // Try to read channel from DOM (with polling)
      const el = await waitForChannelElement(document);
      if (el?.href) {
        const normalized = normalizeChannelHref(el.href);
        if (normalized) {
          entities.push(normalized);
        }
      }
    } else if (handleMatch) {
      // Preserve handle case
      entities.push(`youtube.com${handleMatch[1]}`);
    } else if (channelIdMatch) {
      // Preserve channel ID case
      entities.push(`youtube.com${channelIdMatch[1]}`);
    }

    entities.push('youtube.com');

    return entities;
  },
};
