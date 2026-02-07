"use client";

import { createContext, useContext } from "react";

type ProviderStatus = {
  google: boolean;
  github: boolean;
  discord: boolean;
};

const OAuthContext = createContext<ProviderStatus>({
  google: false,
  github: false,
  discord: false,
});

export function OAuthProviderStatus({
  children,
  providers,
}: {
  children: React.ReactNode;
  providers: ProviderStatus;
}) {
  return <OAuthContext value={providers}>{children}</OAuthContext>;
}

export function useOAuthProviders() {
  return useContext(OAuthContext);
}
