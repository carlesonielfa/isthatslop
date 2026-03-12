import { describe, it, expect } from "bun:test";
import { authActionHtml } from "../../entrypoints/popup/index";

describe("popup auth action", () => {
  it("shows sign-in link when unauthenticated", () => {
    const html = authActionHtml(true);
    expect(html).toContain("Sign in to submit claims");
    expect(html).toContain("/login");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('class="sign-in-btn"');
  });

  it("shows generic submit claim link when authenticated without source", () => {
    const html = authActionHtml(false);
    expect(html).toContain("Submit a claim");
    expect(html).toContain("/claims/new");
    expect(html).not.toContain("source=");
  });

  it("includes source query param when authenticated with a source id", () => {
    const html = authActionHtml(false, "abc-123");
    expect(html).toContain("Submit a claim");
    expect(html).toContain("/claims/new?source=abc-123");
  });
});
