import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const ENCRYPTION_VERSION = "v1";

function getAuthSecret(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return Buffer.from(secret, "utf8");
}

function getEncryptionSecret(): Buffer {
  const encoded = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is required.");
  }
  const secret = Buffer.from(encoded, "base64");
  if (secret.length !== KEY_BYTES) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be 32 base64-encoded bytes.",
    );
  }
  return secret;
}

function deriveKey(root: Buffer, purpose: string): Buffer {
  return createHmac("sha256", root)
    .update(`roster-generator:${purpose}:v1`, "utf8")
    .digest();
}

export function keyedHash(purpose: string, value: string): string {
  return createHmac("sha256", deriveKey(getAuthSecret(), purpose))
    .update(value, "utf8")
    .digest("base64url");
}

export function verifyKeyedHash(
  purpose: string,
  value: string,
  signature: string,
): boolean {
  const expected = Buffer.from(keyedHash(purpose, value), "base64url");
  const received = Buffer.from(signature, "base64url");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function encryptWorkflowState(
  plaintext: string,
  associatedData: string,
  iv: Buffer,
): string {
  if (iv.length !== IV_BYTES) throw new Error("Invalid workflow state IV.");
  const key = deriveKey(getEncryptionSecret(), "sign-in-workflow-state");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptWorkflowState(
  payload: string,
  associatedData: string,
): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== ENCRYPTION_VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Invalid workflow state payload.");
  }
  const key = deriveKey(getEncryptionSecret(), "sign-in-workflow-state");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
