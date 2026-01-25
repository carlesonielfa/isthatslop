import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

// Export commonly used hooks and methods for convenience
export const { signIn, signUp, signOut, useSession, getSession, updateUser } =
  authClient;
