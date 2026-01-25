import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Load .env from monorepo root (for standalone scripts like db:seed)
// Apps using this package (e.g., Next.js) load their own .env
if (import.meta.dirname) {
  config({ path: resolve(import.meta.dirname, "../../../.env") });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Re-export all schema tables and relations
export * from "./schema";
