import { mock } from "bun:test";

// Mock server-only to prevent "cannot be imported from Client Component" error
mock.module("server-only", () => ({}));

// Provide dummy env vars so the Zod env schema doesn't throw during module
// initialization in tests. Real values are irrelevant — the DB and auth modules
// are mocked at the test level anyway.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.RESEND_API_KEY ??= "re_test_dummy";
