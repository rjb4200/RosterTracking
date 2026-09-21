/**
 * The security response headers applied to every route by `next.config.ts`.
 *
 * The content security policy is static, so it lives in configuration rather
 * than in middleware. That means it cannot use per-request nonces, and both
 * `script-src` and `style-src` therefore have to allow inline content: Next
 * injects inline bootstrap scripts and styles, and Tailwind emits inline style
 * attributes. Everything else is locked down.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
].join(", ");

function contentSecurityPolicy(isProduction: boolean): string {
  const directives = [
    "default-src 'self'",
    isProduction
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    // The class sign-in QR code is rendered from a data: URL.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The development server needs its HMR socket; production does not.
    isProduction ? "connect-src 'self'" : "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // Would force the plain-HTTP development origin to HTTPS and break HMR.
  if (isProduction) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaders(
  isProduction: boolean = process.env.NODE_ENV === "production",
): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(isProduction),
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}
