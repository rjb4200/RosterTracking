import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS, ROLE_CODES } from "@/modules/staff-auth/permissions";

const { currentStaff, builder, database } = vi.hoisted(() => ({
  currentStaff: vi.fn(),
  builder: vi.fn(),
  database: {},
}));

vi.mock("@/modules/staff-auth/authorization", () => ({
  getCurrentStaff: currentStaff,
}));
vi.mock("@/server/db/client", () => ({ getDatabase: () => database }));
vi.mock("@/modules/reports/registry", () => ({
  getReport: (id: string) => {
    if (id === "mtu-usage-summary") return { input: null, build: builder };
    if (id === "student-ce-transcript")
      return { input: "student", build: builder };
    return undefined;
  },
}));

import { GET } from "./route";

const validQuery = "report=mtu-usage-summary&from=2026-01-01&to=2026-01-31";

beforeEach(() => {
  vi.resetAllMocks();
  currentStaff.mockResolvedValue({
    id: "staff-1",
    username: "tester",
    permissions: new Set([
      PERMISSIONS.STAFF_ACCESS,
      PERMISSIONS.REPORTING_MANAGE,
    ]),
    roleCodes: new Set([ROLE_CODES.ADMINISTRATOR]),
  });
  builder.mockResolvedValue({
    bytes: new TextEncoder().encode("%PDF-fixture"),
    filename: "mtu-usage-summary.pdf",
    contentType: "application/pdf",
  });
});

describe("report downloads", () => {
  it.each([ROLE_CODES.ADMINISTRATOR, ROLE_CODES.TRAINING_MAJOR])(
    "allows %s with report permission and returns a private attachment",
    async (role) => {
      currentStaff.mockResolvedValue({
        permissions: new Set([PERMISSIONS.REPORTING_MANAGE]),
        roleCodes: new Set([role]),
      });
      const response = await GET(
        new Request(`http://localhost/api/staff/reports?${validQuery}`),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Disposition")).toBe(
        'attachment; filename="mtu-usage-summary.pdf"',
      );
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await response.text()).toBe("%PDF-fixture");
      expect(builder).toHaveBeenCalledWith(
        database,
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
        }),
        expect.objectContaining({ withCertificates: false }),
      );
    },
  );

  it("requires the report's extra input before generating", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/staff/reports?report=student-ce-transcript&from=2026-01-01&to=2026-01-31",
      ),
    );
    expect(response.status).toBe(400);
    expect(builder).not.toHaveBeenCalled();
  });

  it.each([
    [null, 401],
    [
      {
        permissions: new Set([PERMISSIONS.REPORTING_MANAGE]),
        roleCodes: new Set([ROLE_CODES.INSTRUCTOR]),
      },
      403,
    ],
    [
      {
        permissions: new Set(),
        roleCodes: new Set([ROLE_CODES.ADMINISTRATOR]),
      },
      403,
    ],
  ])("rejects missing authorization", async (staff, status) => {
    currentStaff.mockResolvedValue(staff);
    const response = await GET(
      new Request(`http://localhost/api/staff/reports?${validQuery}`),
    );
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(builder).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "report=unknown&from=2026-01-01&to=2026-01-31",
    "report=mtu-usage-summary",
    "report=mtu-usage-summary&from=2026-02-30&to=2026-03-01",
    "report=mtu-usage-summary&from=2026-02-01&to=2026-01-01",
  ])("rejects invalid selections: %s", async (query) => {
    const response = await GET(
      new Request(`http://localhost/api/staff/reports?${query}`),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(builder).not.toHaveBeenCalled();
  });

  it("does not expose internal generation errors", async () => {
    builder.mockRejectedValue(new Error("secret database connection details"));
    const response = await GET(
      new Request(`http://localhost/api/staff/reports?${validQuery}`),
    );
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).not.toContain("secret");
  });
});
