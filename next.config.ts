import type { NextConfig } from "next";

import { securityHeaders } from "./src/server/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/staff/official-rosters/[revisionId]/[formType]": [
      "./src/modules/official-roster-pdfs/*.pdf",
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders() }];
  },
  poweredByHeader: false,
};

export default nextConfig;
