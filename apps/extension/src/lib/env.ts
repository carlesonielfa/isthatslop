// Vite statically replaces import.meta.env.VITE_* at bundle time for all entrypoints.
// In Bun unit tests, import.meta.env is undefined — the try/catch falls back to prod URL.
let _apiBase: string;
try {
  _apiBase = import.meta.env.VITE_API_BASE_URL ?? "https://isthatslop.com";
} catch {
  _apiBase = "https://isthatslop.com";
}

export const API_BASE = _apiBase;
