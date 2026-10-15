import { afterEach, describe, expect, it, vi } from "vitest";

import { createIssue, isIssueReportingConfigured } from "./client";

const TOKEN = "secret-token-value";

describe("github issue client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails cleanly when not configured", async () => {
    vi.stubEnv("GITHUB_ISSUE_TOKEN", "");
    expect(isIssueReportingConfigured()).toBe(false);
    await expect(
      createIssue({ title: "t", body: "b", labels: [] }),
    ).rejects.toThrow("Issue reporting is not configured.");
  });

  it("posts an issue and returns its number and url", async () => {
    vi.stubEnv("GITHUB_ISSUE_TOKEN", TOKEN);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        number: 65,
        html_url: "https://github.com/rjb4200/RosterTracking/issues/65",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const issue = await createIssue({
      title: "[app] Roster did not load",
      body: "body",
      labels: ["user-report", "bug"],
    });
    expect(issue).toEqual({
      number: 65,
      url: "https://github.com/rjb4200/RosterTracking/issues/65",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.github.com/repos/rjb4200/RosterTracking/issues",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      title: "[app] Roster did not load",
      labels: ["user-report", "bug"],
    });
  });

  it("does not leak the token in a failure error", async () => {
    vi.stubEnv("GITHUB_ISSUE_TOKEN", TOKEN);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    const error = await createIssue({
      title: "t",
      body: "b",
      labels: [],
    }).catch((thrown) => thrown as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("The issue could not be created.");
    expect((error as Error).message).not.toContain(TOKEN);
  });
});
