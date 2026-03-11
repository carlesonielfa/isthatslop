import { describe, it, expect } from 'bun:test';
import { redditAdapter } from '../adapters/reddit';
import { youtubeAdapter } from '../adapters/youtube';

// Minimal Document mock that responds to querySelector
function makeDoc(
  selectorMap: Record<string, { href?: string; textContent?: string } | null>,
): Pick<Document, 'querySelector'> {
  return {
    querySelector(selector: string) {
      const entry = selectorMap[selector];
      if (entry === undefined) return null;
      if (entry === null) return null;
      return entry as Element;
    },
  };
}

const emptyDoc = makeDoc({});

describe('Reddit adapter (ADPT-02)', () => {
  it('matches reddit.com URLs', () => {
    expect(redditAdapter.matches('https://reddit.com/r/MachineLearning')).toBe(true);
    expect(redditAdapter.matches('https://www.reddit.com/r/MachineLearning/comments/abc/title')).toBe(true);
    expect(redditAdapter.matches('https://news.ycombinator.com')).toBe(false);
    expect(redditAdapter.matches('https://youtube.com/watch?v=abc')).toBe(false);
  });

  it('extracts user + subreddit + site from a post page URL', async () => {
    const url = 'https://reddit.com/r/MachineLearning/comments/abc123/title';
    const doc = makeDoc({
      '[data-testid="post_author_link"]': { href: 'https://reddit.com/user/alice' },
    });
    const entities = await redditAdapter.extractEntities(url, doc as Document);
    expect(entities).toEqual(['reddit.com/user/alice', 'reddit.com/r/MachineLearning', 'reddit.com']);
  });

  it('extracts subreddit + site from a post page URL when author is missing', async () => {
    const url = 'https://reddit.com/r/MachineLearning/comments/abc123/title';
    const entities = await redditAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['reddit.com/r/MachineLearning', 'reddit.com']);
  });

  it('extracts subreddit + site from a subreddit page URL', async () => {
    const url = 'https://reddit.com/r/MachineLearning/';
    const entities = await redditAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['reddit.com/r/MachineLearning', 'reddit.com']);
  });

  it('falls back to ["reddit.com"] for other reddit pages', async () => {
    const url = 'https://reddit.com/';
    const entities = await redditAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['reddit.com']);
  });
});

describe('YouTube adapter (ADPT-03)', () => {
  it('matches youtube.com and youtu.be URLs', () => {
    expect(youtubeAdapter.matches('https://youtube.com/watch?v=abc')).toBe(true);
    expect(youtubeAdapter.matches('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(youtubeAdapter.matches('https://youtu.be/abc')).toBe(true);
    expect(youtubeAdapter.matches('https://vimeo.com')).toBe(false);
    expect(youtubeAdapter.matches('https://reddit.com')).toBe(false);
  });

  it('extracts channel + site from a video URL when channel DOM is available', async () => {
    const url = 'https://youtube.com/watch?v=abc123';
    const doc = makeDoc({
      'ytd-channel-name a': { href: 'https://youtube.com/@MyChannel', textContent: 'MyChannel' },
      '#channel-name a': null,
    });
    const entities = await youtubeAdapter.extractEntities(url, doc as Document);
    expect(entities).toEqual(['youtube.com/@MyChannel', 'youtube.com']);
  });

  it('falls back to ["youtube.com"] for a video URL with no channel DOM', async () => {
    const url = 'https://youtube.com/watch?v=abc123';
    const entities = await youtubeAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['youtube.com']);
  });

  it('extracts channel + site from a channel page URL (handle)', async () => {
    const url = 'https://youtube.com/@MyChannel';
    const entities = await youtubeAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['youtube.com/@MyChannel', 'youtube.com']);
  });

  it('extracts channel + site from a channel page URL (channel/ID)', async () => {
    const url = 'https://youtube.com/channel/UCabc123';
    const entities = await youtubeAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['youtube.com/channel/UCabc123', 'youtube.com']);
  });

  it('falls back to ["youtube.com"] for other youtube pages', async () => {
    const url = 'https://youtube.com/feed/subscriptions';
    const entities = await youtubeAdapter.extractEntities(url, emptyDoc as Document);
    expect(entities).toEqual(['youtube.com']);
  });
});
