export { TIER_NAMES } from "./tiers";

/**
 * Returns the icon PNG paths for a given tier.
 * @param tier - The tier number (0–4) or null for unscored/neutral.
 * @returns A record mapping size strings ('16', '32', '48') to PNG paths.
 */
export function getIconPaths(
  tier: number | null,
): Record<"16" | "32" | "48", string> {
  const key = tier === null ? "neutral" : `tier${tier}`;
  return {
    "16": `/icons/icon-${key}-16.png`,
    "32": `/icons/icon-${key}-32.png`,
    "48": `/icons/icon-${key}-48.png`,
  };
}
