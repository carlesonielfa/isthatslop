import { mock } from "bun:test";

// Mock server-only to prevent "cannot be imported from Client Component" error
mock.module("server-only", () => ({}));

// Mock React's cache function - it's a no-op in tests
mock.module("react", () => ({
  cache: (fn: unknown) => fn,
}));

// Mock drizzle-orm operators as simple pass-through functions
mock.module("drizzle-orm", () => ({
  desc: () => ({}),
  asc: () => ({}),
  eq: () => ({}),
  isNull: () => ({}),
  count: () => ({}),
  and: () => ({}),
  sql: Object.assign(() => ({}), { raw: (s: string) => s }),
  relations: () => ({}),
}));
