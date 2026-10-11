import type { NextConfig } from "next";

import { noIndexHeader, securityHeaders } from "./src/server/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/staff/official-rosters/[revisionId]/[formType]": [
      "./src/modules/official-roster-pdfs/*.pdf",
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
