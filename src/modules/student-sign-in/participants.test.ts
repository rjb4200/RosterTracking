import { describe, expect, it } from "vitest";

import { optionalCredentialMap } from "./participants";

const offered = [
  { id: "ffn-id", code: "ffn" },
  { id: "kemsis-id", code: "kemsis" },
];

describe("optional public credential capture", () => {
  it("allows sign-in with no credentials or a blank optional input", () => {
    expect(optionalCredentialMap([], offered)).toEqual([]);
    expect(
      optionalCredentialMap(
        [{ credentialTypeId: "ffn-id", value: "" }],
        offered,
      ),
    ).toEqual([]);
  });

  it("validates an entered FFN while accepting optional EMS credentials", () => {
    expect(
      optionalCredentialMap(
        [
          { credentialTypeId: "ffn-id", value: " 1234-5678 " },
          { credentialTypeId: "kemsis-id", value: " EMS-42 " },
        ],
        offered,
      ),
    ).toEqual([
      { credentialTypeId: "ffn-id", code: "ffn", value: "1234-5678" },
      { credentialTypeId: "kemsis-id", code: "kemsis", value: "EMS-42" },
    ]);
    expect(() =>
      optionalCredentialMap(
        [{ credentialTypeId: "ffn-id", value: "12345678" }],
        offered,
      ),
    ).toThrow(/0000-0000/);
  });

  it("rejects unsolicited and repeated credential types", () => {
    expect(() =>
      optionalCredentialMap(
        [{ credentialTypeId: "other-id", value: "1234" }],
        offered,
      ),
    ).toThrow(/offered/);
    expect(() =>
      optionalCredentialMap(
        [
          { credentialTypeId: "ffn-id", value: "1234-5678" },
          { credentialTypeId: "ffn-id", value: "8765-4321" },
        ],
        offered,
      ),
    ).toThrow(/offered/);
  });
});
