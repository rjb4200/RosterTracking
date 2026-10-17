import { describe, expect, it } from "vitest";

import { shouldShowEmailPrompt } from "./email-prompt";

describe("staff email prompt visibility", () => {
  it("shows the prompt when the account has no email", () => {
    expect(shouldShowEmailPrompt(null, "login-1", null)).toBe(true);
    expect(shouldShowEmailPrompt("", "login-1", null)).toBe(true);
  });

  it("does not show the prompt once an email is stored", () => {
    expect(shouldShowEmailPrompt("ada@example.com", "login-1", null)).toBe(
      false,
    );
    expect(shouldShowEmailPrompt("ada@example.com", "login-1", "login-1")).toBe(
      false,
    );
  });

  it("hides the prompt when it was dismissed for this login", () => {
    expect(shouldShowEmailPrompt(null, "login-1", "login-1")).toBe(false);
  });

  it("shows the prompt again after a later login changes the marker", () => {
    expect(shouldShowEmailPrompt(null, "login-2", "login-1")).toBe(true);
  });
});
