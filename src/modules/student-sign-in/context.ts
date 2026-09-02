import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";

import { keyedHash, verifyKeyedHash } from "./crypto";

export const SIGN_IN_CONTEXT_COOKIE_NAME = "roster_sign_in_context";
export const SIGN_IN_COOKIE_PATH = "/sign-in";
export const SIGN_IN_CONTEXT_TTL_SECONDS = 20 * 60;
export const TOKENLESS_SIGN_IN_PATH = "/sign-in";
export const SIGN_IN_REFERRER_POLICY = "no-referrer" as const;

const contextSchema = z.object({
  classId: z.string().uuid(),
  tokenVersion: z.number().int().positive(),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.number().int().positive(),
});

export type SignInContext = z.infer<typeof contextSchema>;

export interface SignInCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: typeof SIGN_IN_COOKIE_PATH;
  maxAge: number;
}

export function signInCookieOptions(
  maxAge = SIGN_IN_CONTEXT_TTL_SECONDS,
  production = process.env.NODE_ENV === "production",
): SignInCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: SIGN_IN_COOKIE_PATH,
    maxAge,
  };
}

export function createSignInContext(
  classId: string,
  tokenVersion: number,
  now = new Date(),
  ttlSeconds = SIGN_IN_CONTEXT_TTL_SECONDS,
): { context: SignInContext; token: string } {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("Sign-in context lifetime must be positive.");
  }
  const context = contextSchema.parse({
    classId,
    tokenVersion,
    nonce: randomBytes(32).toString("base64url"),
    idempotencyKey: randomBytes(32).toString("base64url"),
    expiresAt: Math.floor(now.getTime() / 1000) + ttlSeconds,
  });
  return { context, token: signContext(context) };
}

export function signContext(context: SignInContext): string {
  const validated = contextSchema.parse(context);
  const payload = Buffer.from(JSON.stringify(validated), "utf8").toString(
    "base64url",
  );
  return `${payload}.${keyedHash("sign-in-context", payload)}`;
}

export function validateSignInContext(
  token: string,
  now = new Date(),
): SignInContext | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  if (!verifyKeyedHash("sign-in-context", payload, signature)) return null;
  try {
    const parsed = contextSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    if (parsed.data.expiresAt <= Math.floor(now.getTime() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function hashWorkflowNonce(nonce: string): string {
  return keyedHash("sign-in-workflow-nonce", nonce);
}
