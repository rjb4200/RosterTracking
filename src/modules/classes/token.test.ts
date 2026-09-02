import { describe, expect, it } from "vitest";

import { generateClassSignInToken, hashClassSignInToken } from "./token";

describe("class sign-in tokens", () => {
  it("generates unpredictable URL-safe values and stable hashes", () => {
    const first = generateClassSignInToken();
    const second = generateClassSignInToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashClassSignInToken(first)).toBe(hashClassSignInToken(first));
    expect(hashClassSignInToken(first)).not.toBe(hashClassSignInToken(second));
  });
});
