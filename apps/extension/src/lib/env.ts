// In entrypoints (Vite-processed), import.meta.env is available.
// In src/ files (Bun-tested), it isn't — fall back to production URL.
const isBrowser =
  typeof import.meta !== "undefined" &&
  typeof (import.meta as { env?: unknown }).env !== "undefined";

export const API_BASE = isBrowser
  ? ((import.meta as { env: Record<string, string> }).env.VITE_API_BASE_URL ??
    "https://isthatslop.com")
  : "https://isthatslop.com";
