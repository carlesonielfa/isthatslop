import { mock } from "bun:test";

// Mock server-only to prevent "cannot be imported from Client Component" error
mock.module("server-only", () => ({}));
