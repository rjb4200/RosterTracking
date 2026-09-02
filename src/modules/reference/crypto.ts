import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is required.");
  }
  const buffer = Buffer.from(key, "base64");
  if (buffer.length !== 32) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be 32 base64-encoded bytes.",
    );
  }
  return buffer;
}

export function encryptCredential(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptCredential(payload: string): string {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Invalid credential payload.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivEncoded, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function normalizeCredentialValue(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) {
    throw new Error("Enter a valid credential value.");
  }
  return normalized;
}

export function credentialLookupHash(value: string): string {
  const normalized = normalizeCredentialValue(value);
  return createHmac("sha256", getKey()).update(normalized).digest("base64");
}
