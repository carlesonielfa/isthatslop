import { describe, it, expect, mock } from 'bun:test';
import { checkAndUpdateIcon, normalizeUrl, buildUrlHierarchy } from '../lib/dispatch';

// Minimal document stub for tests (Bun doesn't provide DOM globals)
const mockDoc = { querySelector: () => null } as Pick<Document, 'querySelector'>;

describe('normalizeUrl', () => {
  it('strips scheme, www, trailing slash, and lowercases', () => {
    expect(normalizeUrl('https://Reddit.com/r/ML/')).toBe('reddit.com/r/ml');
    expect(normalizeUrl('http://example.com')).toBe('example.com');
    expect(normalizeUrl('https://www.reddit.com/r/Art/')).toBe('reddit.com/r/art');
    expect(normalizeUrl('http://www.example.com/path')).toBe('example.com/path');
  });
});

describe('buildUrlHierarchy', () => {
  it('returns [normalized] for root domain URLs', () => {
    expect(buildUrlHierarchy('https://example.com')).toEqual(['example.com']);
    expect(buildUrlHierarchy('https://www.example.com/')).toEqual(['example.com']);
  });

  it('returns [path, domain] for path URLs', () => {
    expect(buildUrlHierarchy('https://reddit.com/r/Art/')).toEqual([
      'reddit.com/r/art',
      'reddit.com',
    ]);
    expect(buildUrlHierarchy('https://www.youtube.com/watch?v=123')).toEqual([
      'youtube.com/watch?v=123',
      'youtube.com',
    ]);
  });
});

describe('checkAndUpdateIcon dispatch', () => {
  it('falls back to root domain when specific URL has no match', async () => {
    const getTier = mock(async (url: string) => (url === 'reddit.com' ? 2 : null));
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon('https://www.reddit.com/r/unrated/', mockDoc, [], getTier, setIcon);
    expect(getTier).toHaveBeenCalledWith('reddit.com/r/unrated');
    expect(getTier).toHaveBeenCalledWith('reddit.com');
    expect(setIcon).toHaveBeenCalledWith(2);
  });

  it('uses exact URL match before falling back to domain', async () => {
    const getTier = mock(async (url: string) => (url === 'reddit.com/r/art' ? 1 : 3));
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon('https://reddit.com/r/Art/', mockDoc, [], getTier, setIcon);
    expect(getTier).toHaveBeenCalledTimes(1);
    expect(setIcon).toHaveBeenCalledWith(1);
  });

  it('uses plain URL when no adapter matches', async () => {
    const getTier = mock(async (_url: string) => null);
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon('https://example.com/', mockDoc, [], getTier, setIcon);
    expect(getTier).toHaveBeenCalledWith('example.com');
    expect(setIcon).toHaveBeenCalledWith(null);
  });

  it('uses adapter entities when adapter matches', async () => {
    const adapter = {
      matches: (_url: string) => true,
      extractEntities: async (_url: string, _doc: Pick<Document, 'querySelector'>) =>
        ['entity.com/specific', 'entity.com'],
    };
    const getTier = mock(async (url: string) => (url === 'entity.com/specific' ? 2 : null));
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon(
      'https://entity.com/specific',
      mockDoc,
      [adapter],
      getTier,
      setIcon,
    );
    expect(setIcon).toHaveBeenCalledWith(2);
  });

  it('walks hierarchy and stops at first cache hit', async () => {
    const adapter = {
      matches: () => true,
      extractEntities: async () => ['miss.com/page', 'miss.com/section', 'miss.com'],
    };
    const getTier = mock(async (url: string) => (url === 'miss.com/section' ? 1 : null));
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon('https://miss.com/page', mockDoc, [adapter], getTier, setIcon);
    expect(getTier).toHaveBeenCalledTimes(2); // stopped after 2nd URL hit
    expect(setIcon).toHaveBeenCalledWith(1);
  });

  it('sends null when nothing in hierarchy matches cache', async () => {
    const adapter = {
      matches: () => true,
      extractEntities: async () => ['miss.com/a', 'miss.com'],
    };
    const getTier = mock(async (_url: string) => null);
    const setIcon = mock((_tier: number | null) => {});
    await checkAndUpdateIcon('https://miss.com/a', mockDoc, [adapter], getTier, setIcon);
    expect(setIcon).toHaveBeenCalledWith(null);
  });
});
