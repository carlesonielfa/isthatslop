// Reputation tier configuration - shared between server and client
export const reputationTiers = [
  { minRep: 0, name: "Member", color: "#a8a8a8" },
  { minRep: 100, name: "Trusted", color: "#428542" },
  { minRep: 500, name: "Expert", color: "#6e6eff" },
  { minRep: 1000, name: "Master", color: "#a250a2" },
] as const;

export type ReputationTier = (typeof reputationTiers)[number];

export function getReputationTier(reputation: number): ReputationTier {
  for (let i = reputationTiers.length - 1; i >= 0; i--) {
    const tier = reputationTiers[i];
    if (tier && reputation >= tier.minRep) {
      return tier;
    }
  }
  return reputationTiers[0]!;
}
