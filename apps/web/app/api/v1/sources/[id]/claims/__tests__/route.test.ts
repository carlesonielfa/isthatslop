import { describe, it } from "bun:test";

describe("POST /api/v1/sources/:id/claims", () => {
  it.todo("returns 201 with { claimId, sourceId } when authenticated and valid");
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 403 when email is not verified");
  it.todo("returns 429 when rate limited");
  it.todo("returns 422 when impact is out of range");
  it.todo("returns 422 when confidence is out of range");
  it.todo("returns 422 when content is too short");
  it.todo("returns 404 when source does not exist");
});
