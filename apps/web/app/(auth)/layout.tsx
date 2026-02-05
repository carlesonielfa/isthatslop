import { OAuthProviderStatus } from "@/components/oauth-provider-context";
import { configuredProviders } from "@/app/lib/oauth-config";

/**
 * Auth layout wraps authentication pages (login, signup)
 * Provides OAuth provider configuration status to client components
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OAuthProviderStatus providers={configuredProviders}>
      {children}
    </OAuthProviderStatus>
  );
}
