import { describe, it, expect } from "bun:test";
import { authActionHtml } from "../../entrypoints/popup/index";

describe("authActionHtml (claim flow via web)", () => {
  it("returns sign-in link when showSignIn is true", () => {
    const html = authActionHtml(true, "source-1");
    expect(html).toContain("<a");
    expect(html).toContain("Sign in");
  });

  it("returns submit claim link pointing to web app when authenticated with sourceId", () => {
    const html = authActionHtml(false, "source-1");
    expect(html).toContain("<a");
    expect(html).toContain("/claims/new");
    expect(html).toContain("source-1");
  });

  it("returns new source link when authenticated without sourceId", () => {
    const html = authActionHtml(false, undefined, "https://example.com");
    expect(html).toContain("<a");
    expect(html).toContain("/sources/new");
  });
});
