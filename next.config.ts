import type { NextConfig } from "next";

import { noIndexHeader, securityHeaders } from "./src/server/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/staff/official-rosters/[revisionId]/[formType]": [
      "./src/modules/official-roster-pdfs/*.pdf",
    ],
    // Completion certificates embed bundled fonts; the API route, report
    // generation, and the staff class screens that finalize or resend need them.
    "/api/staff/completion-certificates/[revisionId]": [
      "./src/modules/official-roster-pdfs/fonts/*.ttf",
    ],
    "/api/staff/reports": ["./src/modules/official-roster-pdfs/fonts/*.ttf"],
    "/staff/(protected)/classes/[id]": [
      "./src/modules/official-roster-pdfs/fonts/*.ttf",
    ],
    "/staff/(protected)/classes/[id]/edit": [
      "./src/modules/official-roster-pdfs/fonts/*.ttf",
    ],
    "/staff/(protected)/classes/[id]/review": [
      "./src/modules/official-roster-pdfs/fonts/*.ttf",
    ],
    "/staff/(protected)/classes/new": [
      "./src/modules/official-roster-pdfs/fonts/*.ttf",
    ],
  },
  async headers() {
    const headers = securityHeaders();
    const robots = noIndexHeader();
    if (robots) headers.push(robots);
    return [{ source: "/(.*)", headers }];
  },
  poweredByHeader: false,
};

export default nextConfig;
