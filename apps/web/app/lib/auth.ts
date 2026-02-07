import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "@repo/database";
import { sendVerificationEmail, sendResetPasswordEmail } from "./email";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Fire-and-forget to prevent timing attacks
      sendResetPasswordEmail(user, url).catch((err) =>
        console.error("[Auth] Failed to send password reset email:", err),
      );
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Fire-and-forget to prevent timing attacks
      sendVerificationEmail(user, url).catch((err) =>
        console.error("[Auth] Failed to send verification email:", err),
      );
    },
    sendOnSignUp: true,
    // Note: better-auth uses 24-hour expiry by default for verification tokens
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "discord"],
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  user: {
    additionalFields: {
      reputation: {
        type: "number",
        defaultValue: 0,
      },
      role: {
        type: "string",
        defaultValue: "member",
      },
      avatarUrl: {
        type: "string",
        defaultValue: null,
      },
    },
  },
});
