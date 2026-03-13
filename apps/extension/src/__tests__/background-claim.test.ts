import { describe, it } from "bun:test";

describe("SUBMIT_CLAIM background handler", () => {
  it.todo("calls POST /api/v1/sources/:id/claims with bearer token from storage");
  it.todo("returns { ok: true, claimId, sourceId } on success");
  it.todo("returns { ok: false, error } on API error");
  it.todo("returns { ok: false, error, retryAfter } on 429 response");
});

describe("CREATE_SOURCE background handler", () => {
  it.todo("calls POST /api/v1/sources with bearer token and returns { id, name }");
  it.todo("returns { ok: false, error } on API error");
});
