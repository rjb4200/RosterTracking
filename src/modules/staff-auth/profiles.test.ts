import { describe, expect, it } from "vitest";

import {
  changedProfileAttributes,
  parseProfileInput,
} from "./profile-contract";

describe("instructor profile input", () => {
  it("normalizes blank values to null", () => {
    expect(
      parseProfileInput({
        ffn: "",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toEqual({ ffn: null, instructorLevel: null, emsProviderNumber: null });
  });

  it("accepts a Fire Commission FFN, a level, and trims the provider number", () => {
    expect(
      parseProfileInput({
        ffn: "0009-9999",
        instructorLevel: "2",
        emsProviderNumber: "  EMS-123  ",
      }),
    ).toEqual({
      ffn: "0009-9999",
      instructorLevel: 2,
      emsProviderNumber: "EMS-123",
    });
  });

  it("rejects a malformed FFN", () => {
    expect(() =>
      parseProfileInput({
        ffn: "12345",
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).toThrow(/0000-0000/);
  });

  it("rejects a certification level outside one to three", () => {
    expect(() =>
      parseProfileInput({
        ffn: "",
        instructorLevel: "4",
        emsProviderNumber: "",
      }),
    ).toThrow(/1, 2, or 3/);
  });

  it("rejects a non-numeric certification level", () => {
    expect(() =>
      parseProfileInput({
        ffn: "",
        instructorLevel: "senior",
        emsProviderNumber: "",
      }),
    ).toThrow(/1, 2, or 3/);
  });

  it("reports only the attributes that changed", () => {
    expect(
      changedProfileAttributes(
        { ffn: null, instructorLevel: null, emsProviderNumber: null },
        { ffn: "0001-2345", instructorLevel: 1, emsProviderNumber: null },
      ),
    ).toEqual(["ffn", "instructorLevel"]);
  });

  it("reports no change when values are identical", () => {
    const values = {
      ffn: "0001-2345",
      instructorLevel: 1,
      emsProviderNumber: null,
    };
    expect(changedProfileAttributes(values, values)).toEqual([]);
  });
});
