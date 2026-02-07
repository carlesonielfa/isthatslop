import "server-only";
import { configuredProviders } from "@/app/lib/oauth-config";

/**
 * Data Access Layer for auth configuration
 * Returns which OAuth providers are properly configured
 */
export function getConfiguredProviders() {
  return configuredProviders;
}
