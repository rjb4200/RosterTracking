import { afterEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "./client";

describe("email client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("marks an attachment with a content id as an inline part", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "msg-1" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({
      recipient: "ada@example.com",
      subject: "Certificate",
      html: '<img src="cid:wfd-logo" />',
      text: "certificate",
      attachments: [
        {
          filename: "wfd-logo.png",
          bytes: new Uint8Array([1, 2, 3]),
          contentType: "image/png",
          contentId: "wfd-logo",
        },
        {
          filename: "cert.pdf",
          bytes: new Uint8Array([4, 5, 6]),
          contentType: "application/pdf",
        },
      ],
    });

    expect(result.providerMessageId).toBe("msg-1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body as string);
    expect(body.attachments[0]).toMatchObject({
      filename: "wfd-logo.png",
      content_id: "wfd-logo",
      content_type: "image/png",
    });
    expect(body.attachments[1]).toMatchObject({
      filename: "cert.pdf",
      content_type: "application/pdf",
    });
    expect(body.attachments[1]).not.toHaveProperty("content_id");
  });

  it("uses the attachment metadata instead of the filename extension", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "msg-2" }) });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      recipient: "ada@example.com",
      subject: "Certificate",
      html: "<p>certificate</p>",
      text: "certificate",
      attachments: [
        {
          filename: "certificate.bin",
          bytes: new Uint8Array([7, 8, 9]),
          contentType: "application/pdf",
        },
      ],
    });

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("Expected a fetch call.");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.attachments[0]).toMatchObject({
      filename: "certificate.bin",
      content_type: "application/pdf",
    });
  });

  it("fails cleanly when email is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(
      sendEmail({
        recipient: "ada@example.com",
        subject: "Certificate",
        html: "<p>hi</p>",
        text: "hi",
      }),
    ).rejects.toThrow("Email delivery is not configured.");
  });
});
