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

export function requestSourceFingerprint(ipAddress: string): string {
  return keyedHash("sign-in-request-source", ipAddress.trim().toLowerCase());
}

export function extractTrustedRequestMetadata(
  headers: Headers,
  correlationId: string = randomUUID(),
): TrustedRequestMetadata {
  const trustedIpAddress =
    ipAddress(headers) ??
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
  const supplied = headers.get("origin");
  if (!supplied) return false;
  try {
    const expected = new URL(configuredOrigin ?? requestUrl ?? "").origin;
    return new URL(supplied).origin === expected;
  } catch {
    return false;
  }
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
