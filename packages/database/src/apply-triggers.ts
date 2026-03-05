import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const EXPECTED_TRIGGERS = [
  "mark_scores_stale_after_claim",
  "mark_scores_stale_after_vote",
] as const;

export async function applyTriggers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: NodePgDatabase<Record<string, any>>,
): Promise<void> {
  const triggersDir = join(import.meta.dirname, "./triggers");

  const files = await readdir(triggersDir);
  const triggerFiles = files.filter((f) => f.endsWith(".sql")).sort();

  for (const file of triggerFiles) {
    const filePath = join(triggersDir, file);
    console.log(`[triggers] Applying ${file}...`);
    const content = await readFile(filePath, "utf-8");
    await db.execute(sql.raw(content));
    console.log(`[triggers] Applied ${file}`);
  }

  const result = await db.execute(sql`
    SELECT tgname FROM pg_trigger
    WHERE tgname IN ('mark_scores_stale_after_claim', 'mark_scores_stale_after_vote')
    ORDER BY tgname
  `);

  const foundNames = new Set(result.rows.map((row) => row.tgname as string));
  const missingNames = EXPECTED_TRIGGERS.filter((name) => !foundNames.has(name));

  if (missingNames.length > 0) {
    throw new Error(
      `[triggers] Verification failed — missing triggers: ${missingNames.join(", ")}`,
    );
  }
}
