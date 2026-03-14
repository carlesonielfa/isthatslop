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

  it("shows submit claim link when authenticated with a source id", () => {
    const html = authActionHtml(false, "abc-123");
    expect(html).toContain("Submit a claim");
    expect(html).toContain("/claims/new?source=abc-123");
    expect(html).toContain('target="_blank"');
  });

  it("shows add source link when authenticated without source id", () => {
    const html = authActionHtml(false, undefined, "https://example.com");
    expect(html).toContain("Add source");
    expect(html).toContain("/sources/new");
    expect(html).toContain("example.com");
  });

  it("includes tab title as name param in add source link", () => {
    const html = authActionHtml(
      false,
      undefined,
      "https://example.com",
      "Example Site",
    );
    expect(html).toContain("name=Example+Site");
    expect(html).toContain("url=");
  });
});
