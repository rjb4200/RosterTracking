import "server-only";

import { randomUUID } from "node:crypto";
import { ipAddress } from "@vercel/functions";

import { keyedHash } from "./crypto";

export interface TrustedRequestMetadata {
  ipAddress: string;
  requestCorrelationId: string;
  requestSourceFingerprint: string;
}

async function resolveHeaders(request?: Request): Promise<Headers> {
  if (request) return request.headers;
  const { headers } = await import("next/headers");
  return headers();
}

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function requestSourceFingerprint(ipAddress: string): string {
  return keyedHash("sign-in-request-source", ipAddress.trim().toLowerCase());
}

/**
 * The bounded set of origins a public sign-in mutation may come from:
 * the configured canonical origin, and the deployment's project production
 * domain. Compared by full origin (scheme, host, and port) so no wildcard,
 * suffix, or lookalike host is ever accepted.
 */
export function trustedSignInOrigins(
  configuredOrigin = process.env.NEXTAUTH_URL,
  projectProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL,
): Set<string> {
  const origins = new Set<string>();
  const configured = originOf(configuredOrigin);
  if (configured) origins.add(configured);
  const project = originOf(
    projectProductionUrl ? `https://${projectProductionUrl}` : undefined,
  );
  if (project) origins.add(project);
  return origins;
}

export function extractTrustedRequestMetadata(
  headers: Headers,
  correlationId: string = randomUUID(),
): TrustedRequestMetadata {
  // `ipAddress` treats any input with a `headers` property as a request-like and
  // reads through it. Next's `headers()` returns an adapter that exposes its own
  // `headers` property, so pass an explicit request-like wrapper that always
  // resolves to the headers object we were given.
  const trustedIpAddress =
    ipAddress({ headers } as unknown as Headers) ??
    firstHeaderValue(headers.get("x-forwarded-for")) ??
    "unknown";
  return {
    ipAddress: trustedIpAddress,
    requestCorrelationId:
      firstHeaderValue(headers.get("x-vercel-id")) ?? correlationId,
    requestSourceFingerprint: requestSourceFingerprint(trustedIpAddress),
  };
}

export async function getTrustedRequestMetadata(
  request?: Request,
): Promise<TrustedRequestMetadata> {
  return extractTrustedRequestMetadata(await resolveHeaders(request));
}

export function isSameOriginRequest(
  headers: Pick<Headers, "get">,
  requestUrl?: string,
  configuredOrigin = process.env.NEXTAUTH_URL,
): boolean {
  const supplied = originOf(headers.get("origin") ?? undefined);
  if (!supplied) return false;
  // The request's own origin is trusted so a deployment served on a legitimate
  // alternate host still works. It is added per request and never derived from
  // caller-controlled input beyond that single header equality.
  const requestOrigin = originOf(requestUrl);
  if (requestOrigin && supplied === requestOrigin) return true;
  return trustedSignInOrigins(configuredOrigin).has(supplied);
}

export async function validateSameOriginRequest(
  request?: Request,
): Promise<boolean> {
  return isSameOriginRequest(
    await resolveHeaders(request),
    request?.url,
    process.env.NEXTAUTH_URL,
  );
}
