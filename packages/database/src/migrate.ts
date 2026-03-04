import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

await migrate(db, {
  migrationsFolder: resolve(import.meta.dirname, "../drizzle"),
});

await pool.end();

console.log("Migrations applied successfully.");
