/**
 * OAuth provider configuration detection
 * Checks which OAuth providers have valid credentials configured
 */

export const configuredProviders = {
  google: !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ),
  github: !!(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  ),
  discord: !!(
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
  ),
} as const;

export type OAuthProvider = keyof typeof configuredProviders;
