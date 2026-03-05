import "server-only";
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

const EXPECTED_TRIGGERS = [
  "mark_scores_stale_after_claim",
  "mark_scores_stale_after_vote",
] as const;

export async function checkTriggers(): Promise<void> {
  const result = await db.execute(sql`
    SELECT tgname FROM pg_trigger
    WHERE tgname IN ('mark_scores_stale_after_claim', 'mark_scores_stale_after_vote')
    ORDER BY tgname
  `);

  const found = (result.rows as { tgname: string }[]).map((r) => r.tgname);
  const missing = EXPECTED_TRIGGERS.filter((name) => !found.includes(name));

  if (missing.length > 0) {
    console.warn(
      `[startup] WARNING: Missing database triggers: ${missing.join(", ")}. ` +
        "Score cache may not be marked stale automatically. Run `bun run db:triggers` to fix.",
    );
  } else {
    console.log("[startup] Database triggers verified: all present.");
  }
}
