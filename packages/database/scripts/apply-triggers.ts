#!/usr/bin/env bun

import { db } from "../src/index";
import { applyTriggers } from "../src/apply-triggers";

try {
  await applyTriggers(db);
  console.log("All triggers applied and verified successfully!");
  process.exit(0);
} catch (error) {
  console.error("Failed to apply triggers:", error);
  process.exit(1);
}
