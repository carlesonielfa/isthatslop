import { describe, it, expect, beforeEach, mock } from "bun:test";
import { chromeMock } from "./mocks/chrome";

// WXT macro stub — must be installed as global BEFORE background.ts loads.
// background.ts uses `defineBackground` as a bare global identifier (WXT injects it).
// We make it a no-op so the chrome listener registrations inside don't run in tests.
// The exported functions (submitClaimRequest, createSourceRequest) are tested directly.
(globalThis as unknown as Record<string, unknown>).defineBackground = (
  _fn: () => void,
) => {};

const { submitClaimRequest, createSourceRequest } =
  await import("../../entrypoints/background");

const TEST_TOKEN = "test-bearer-token";
const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("SUBMIT_CLAIM background handler", () => {
  beforeEach(() => {
    // Reset chrome storage mock to return test token by default
    chromeMock.storage.local.get = async (_keys) =>
      ({ authToken: TEST_TOKEN }) as Record<string, unknown>;

    // Reset fetch mock
    (globalThis as unknown as Record<string, unknown>).fetch = undefined;
  });

  it("calls POST /api/v1/sources/:id/claims with bearer token from storage", async () => {
    let capturedRequest: Request | undefined;
    globalThis.fetch = mock(async (req: Request) => {
      capturedRequest = req;
      return new Response(
        JSON.stringify({ claimId: "claim-uuid-1", sourceId: VALID_UUID }),
        { status: 201 },
      );
    }) as unknown as typeof fetch;

    await submitClaimRequest({
      sourceId: VALID_UUID,
      content: "a".repeat(100),
      impact: 3,
      confidence: 4,
    });

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest!.headers.get("Authorization")).toBe(
      `Bearer ${TEST_TOKEN}`,
    );
    expect(capturedRequest!.method).toBe("POST");
    expect(capturedRequest!.url).toContain(`/sources/${VALID_UUID}/claims`);
  });

  it("returns { ok: true, claimId, sourceId } on success", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ claimId: "claim-uuid-1", sourceId: VALID_UUID }),
          { status: 201 },
        ),
    ) as unknown as typeof fetch;

    const result = await submitClaimRequest({
      sourceId: VALID_UUID,
      content: "a".repeat(100),
      impact: 3,
      confidence: 4,
    });

    expect(result).toEqual({
      ok: true,
      claimId: "claim-uuid-1",
      sourceId: VALID_UUID,
    });
  });

  it("returns { ok: false, error } on API error", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
    ) as unknown as typeof fetch;

    const result = await submitClaimRequest({
      sourceId: VALID_UUID,
      content: "a".repeat(100),
      impact: 3,
      confidence: 4,
    });

    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toBeTruthy();
  });

  it("returns { ok: false, error, retryAfter } on 429 response", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { "Retry-After": "60" },
        }),
    ) as unknown as typeof fetch;

    const result = await submitClaimRequest({
      sourceId: VALID_UUID,
      content: "a".repeat(100),
      impact: 3,
      confidence: 4,
    });

    expect(result).toMatchObject({ ok: false, retryAfter: 60 });
  });
});

describe("CREATE_SOURCE background handler", () => {
  beforeEach(() => {
    chromeMock.storage.local.get = async (_keys) =>
      ({ authToken: TEST_TOKEN }) as Record<string, unknown>;

    (globalThis as unknown as Record<string, unknown>).fetch = undefined;
  });

  it("calls POST /api/v1/sources with bearer token and returns { id, name }", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ id: "source-uuid-1", name: "Test Source" }),
          { status: 201 },
        ),
    ) as unknown as typeof fetch;

    const result = await createSourceRequest({
      name: "Test Source",
      url: "https://example.com",
    });

    expect(result).toEqual({
      ok: true,
      id: "source-uuid-1",
      name: "Test Source",
    });
  });

  it("returns { ok: false, error } on API error", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    ) as unknown as typeof fetch;

    const result = await createSourceRequest({
      name: "Test Source",
      url: "https://example.com",
    });

    expect(result).toMatchObject({ ok: false });
  });
});
