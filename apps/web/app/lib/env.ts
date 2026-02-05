import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  BETTER_AUTH_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().min(1),

  // OAuth providers (all optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);

// Determine which OAuth providers are fully configured
export const configuredProviders = {
  google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  discord: !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
};

// Warn about partial OAuth configurations
const oauthPairs = [
  { name: "Google", id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET },
  { name: "GitHub", id: env.GITHUB_CLIENT_ID, secret: env.GITHUB_CLIENT_SECRET },
  { name: "Discord", id: env.DISCORD_CLIENT_ID, secret: env.DISCORD_CLIENT_SECRET },
];

for (const provider of oauthPairs) {
  const hasId = !!provider.id;
  const hasSecret = !!provider.secret;
  if (hasId !== hasSecret) {
    console.warn(
      `[Auth] WARNING: ${provider.name} OAuth is partially configured. ` +
      `Found ${hasId ? "client ID" : "client secret"} but missing ${hasId ? "client secret" : "client ID"}. ` +
      `Set both ${provider.name.toUpperCase()}_CLIENT_ID and ${provider.name.toUpperCase()}_CLIENT_SECRET, or remove both.`
    );
  }
}
