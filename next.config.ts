import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/staff/official-rosters/[revisionId]/[formType]": [
      "./src/modules/official-roster-pdfs/*.pdf",
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
