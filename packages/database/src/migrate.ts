import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { applyTriggers } from "./apply-triggers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: resolve(import.meta.dirname, "../drizzle"),
  });
  console.log("Migrations applied successfully.");
  await applyTriggers(db);
  console.log("Triggers applied successfully.");
} finally {
  await pool.end();
}
