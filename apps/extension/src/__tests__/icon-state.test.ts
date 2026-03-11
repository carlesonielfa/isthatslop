import { describe, expect, it } from 'bun:test';
import { getIconPaths } from '../lib/icon-state';
import { TIER_COLORS } from '../lib/tiers';

describe('Icon state (EXT-02)', () => {
  it('returns neutral icon paths when tier is null', () => {
    const paths = getIconPaths(null);
    expect(paths['16']).toBe('/icons/icon-neutral-16.png');
    expect(paths['32']).toBe('/icons/icon-neutral-32.png');
    expect(paths['48']).toBe('/icons/icon-neutral-48.png');
  });

  it('returns tier-0 (dark green) icon paths for tier 0', () => {
    const paths = getIconPaths(0);
    expect(paths['16']).toBe('/icons/icon-tier0-16.png');
    expect(paths['32']).toBe('/icons/icon-tier0-32.png');
    expect(paths['48']).toBe('/icons/icon-tier0-48.png');
  });

  it('returns tier-4 (red) icon paths for tier 4', () => {
    const paths = getIconPaths(4);
    expect(paths['16']).toBe('/icons/icon-tier4-16.png');
    expect(paths['32']).toBe('/icons/icon-tier4-32.png');
    expect(paths['48']).toBe('/icons/icon-tier4-48.png');
  });

  it('returns correct paths for all three sizes: 16, 32, 48', () => {
    const paths = getIconPaths(2);
    expect(Object.keys(paths)).toEqual(['16', '32', '48']);
    expect(paths['16']).toBe('/icons/icon-tier2-16.png');
    expect(paths['32']).toBe('/icons/icon-tier2-32.png');
    expect(paths['48']).toBe('/icons/icon-tier2-48.png');
  });

  it('TIER_COLORS[0] is dark green', () => {
    expect(TIER_COLORS[0]).toBe('#006400');
  });

  it('TIER_COLORS neutral is grey', () => {
    expect(TIER_COLORS['neutral']).toBe('#808080');
  });
});
