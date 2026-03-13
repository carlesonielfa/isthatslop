import { describe, it, expect } from "bun:test";
import { authActionHtml, renderClaimForm, renderNewSourceConfirm } from "../../entrypoints/popup/index";

describe("authActionHtml (updated)", () => {
  it("returns sign-in link when showSignIn is true", () => {
    const html = authActionHtml(true, "source-1");
    expect(html).toContain("<a");
    expect(html).toContain("Sign in");
  });

  it("returns 'Submit a claim' button (not link) when authenticated and sourceId provided", () => {
    const html = authActionHtml(false, "source-1");
    expect(html).toContain("<button");
    expect(html).not.toContain("<a");
    expect(html).toContain('data-action="submit-claim"');
    expect(html).toContain('data-source-id="source-1"');
    expect(html).toContain("Submit a claim");
  });
});

describe("renderClaimForm state", () => {
  it("claim form render function is exported and callable", () => {
    expect(typeof renderClaimForm).toBe("function");
  });

  it("renderNewSourceConfirm is exported and callable", () => {
    expect(typeof renderNewSourceConfirm).toBe("function");
  });
});
