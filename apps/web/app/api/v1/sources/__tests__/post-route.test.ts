import { describe, it } from "bun:test";

describe("POST /api/v1/sources", () => {
  it.todo("returns 201 with { id, name } when authenticated and valid");
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 403 when email is not verified");
  it.todo("returns 400 when URL is missing or invalid");
  it.todo("returns 400 when name is empty");
});
