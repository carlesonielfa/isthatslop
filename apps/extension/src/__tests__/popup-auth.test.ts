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

  it("shows submit claim link when authenticated", () => {
    const html = authActionHtml(false);
    expect(html).toContain("Submit a claim");
    expect(html).toContain("/claims/new");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('class="sign-in-btn"');
  });
});
