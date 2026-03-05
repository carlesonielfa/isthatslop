export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { checkTriggers } = await import("./lib/check-triggers");
    await checkTriggers();
  } catch (err) {
    console.warn("[startup] Trigger check failed (non-fatal):", err);
  }
}
