import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const SECRET = "test-cron-secret-value-123456";

function scheduleRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api/cron/class-reminders", {
    headers,
  });
}

describe("class reminder schedule route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request without the schedule authorization", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const response = await GET(scheduleRequest());
    expect(response.status).toBe(401);
  });

  it("rejects a request when the secret is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(
      scheduleRequest({ authorization: `Bearer ${SECRET}` }),
    );
    expect(response.status).toBe(401);
  });

  it("no-ops outside production even when authorized", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = await GET(
      scheduleRequest({ authorization: `Bearer ${SECRET}` }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ skipped: true });
  });
});
