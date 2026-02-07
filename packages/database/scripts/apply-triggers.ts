#!/usr/bin/env bun

import { sql } from "drizzle-orm";
import { db } from "../src/index";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

async function applyTriggers() {
  const triggersDir = join(import.meta.dirname, "../src/triggers");

  try {
    // Read all .sql files from triggers directory
    const files = await readdir(triggersDir);
    const triggerFiles = files.filter((f) => f.endsWith(".sql"));

    if (triggerFiles.length === 0) {
      console.log("No trigger files found in", triggersDir);
      process.exit(0);
    }

    console.log(`Found ${triggerFiles.length} trigger file(s) to apply:`);
    triggerFiles.forEach((f) => console.log(`  - ${f}`));
    console.log();

    // Apply each trigger file
    for (const file of triggerFiles) {
      const filePath = join(triggersDir, file);
      console.log(`Applying ${file}...`);

      try {
        const triggerSql = await readFile(filePath, "utf-8");
        await db.execute(sql.raw(triggerSql));
        console.log(`✓ ${file} applied successfully`);
      } catch (error) {
        console.error(`✗ ${file} failed:`, error);
        throw error;
      }
    }

    console.log();

    // Verify triggers exist in pg_trigger catalog
    const result = await db.execute(sql`
      SELECT tgname, tgrelid::regclass AS table_name
      FROM pg_trigger
      WHERE tgname IN ('mark_scores_stale_after_claim', 'mark_scores_stale_after_vote')
      ORDER BY tgname
    `);

    console.log("Active triggers:");
    if (result.rows.length === 0) {
      console.log("  (none found - verification failed)");
      process.exit(1);
    }

    for (const row of result.rows) {
      console.log(`  - ${row.tgname} on ${row.table_name}`);
    }

    console.log();
    console.log("All triggers applied and verified successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to apply triggers:", error);
    process.exit(1);
  }
}

applyTriggers();
