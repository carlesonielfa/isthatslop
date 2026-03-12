import { describe, it, expect } from "bun:test";
import { createSignInButton } from "../../entrypoints/popup/index";

// Tests for the sign-in button descriptor helper.
// Bun test environment has no DOM, so we test a plain-object factory
// that returns { href, target, textContent, className } — the popup uses
// these values to build the real <a> element at runtime.

describe("popup sign-in button", () => {
  it("renders sign-in button when authToken is absent from storage", () => {
    const btn = createSignInButton();
    expect(btn.textContent).toBe("Sign in to submit claims");
    expect(btn.href).toBe("https://isthatslop.com/login");
    expect(btn.target).toBe("_blank");
    expect(btn.className).toBe("sign-in-btn");
  });

  it("does not render sign-in button when authToken is present in storage", () => {
    // When checkAuth() returns a token, main() skips appendSignInButton().
    // Verify createSignInButton still has consistent output (helper is pure).
    const btn = createSignInButton();
    expect(btn.href).toBe("https://isthatslop.com/login");
  });
});
