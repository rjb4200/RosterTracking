import { describe, expect, it } from "vitest";

import {
  changedProfileAttributes,
  parseProfileInput,
} from "./profile-contract";

describe("instructor profile input", () => {
  it("normalizes blank values to null", () => {
    expect(
      parseProfileInput({
        email: "",
        ffn: "",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toEqual({
      email: null,
      ffn: null,
      instructorLevel: null,
      emsProviderNumber: null,
    });
  });

  it("accepts a Fire Commission FFN, a level, and trims the provider number", () => {
    expect(
      parseProfileInput({
        email: "",
        ffn: "0009-9999",
        instructorLevel: "2",
        emsProviderNumber: "  EMS-123  ",
      }),
    ).toEqual({
      email: null,
      ffn: "0009-9999",
      instructorLevel: 2,
      emsProviderNumber: "EMS-123",
    });
  });

  it("normalizes and accepts an account email", () => {
    expect(
      parseProfileInput({
        email: "  Ada@Example.COM  ",
        ffn: "",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toMatchObject({ email: "ada@example.com" });
  });

  it("rejects an invalid account email", () => {
    expect(() =>
      parseProfileInput({
        email: "not-an-email",
        ffn: "",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toThrow();
  });

  it("normalizes a digits-only FFN to the canonical form", () => {
    expect(
      parseProfileInput({
        email: "",
        ffn: "12345678",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toMatchObject({ ffn: "1234-5678" });
  });

  it("rejects an FFN that cannot be normalized", () => {
    expect(() =>
      parseProfileInput({
        email: "",
        ffn: "ABC123",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toThrow(/0000-0000/);
  });

  it("rejects a certification level outside one to three", () => {
    expect(() =>
      parseProfileInput({
        email: "",
        ffn: "",
        instructorLevel: "4",
        emsProviderNumber: "",
      }),
    ).toThrow(/1, 2, or 3/);
  });

  it("rejects a non-numeric certification level", () => {
    expect(() =>
      parseProfileInput({
        email: "",
        ffn: "",
        instructorLevel: "senior",
        emsProviderNumber: "",
      }),
    ).toThrow(/1, 2, or 3/);
  });

  it("reports only the attributes that changed", () => {
    expect(
      changedProfileAttributes(
        {
          email: null,
          ffn: null,
          instructorLevel: null,
          emsProviderNumber: null,
        },
        {
          email: "ada@example.com",
          ffn: "0001-2345",
          instructorLevel: 1,
          emsProviderNumber: null,
        },
      ),
    ).toEqual(["email", "ffn", "instructorLevel"]);
  });

  it("reports no change when values are identical", () => {
    const values = {
      email: "ada@example.com",
      ffn: "0001-2345",
      instructorLevel: 1,
      emsProviderNumber: null,
    };
    expect(changedProfileAttributes(values, values)).toEqual([]);
  });
});
