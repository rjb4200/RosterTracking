import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const CLASS_PUBLIC_CODE_PATTERN =
  /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PIN_PATTERN = /^\d{4}$/;

function getEncryptionKey(): Buffer {
  const encoded = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("CREDENTIAL_ENCRYPTION_KEY is required.");
  const root = Buffer.from(encoded, "base64");
  if (root.length !== 32) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be 32 base64-encoded bytes.",
    );
  }
  return createHmac("sha256", root)
    .update("roster-generator:class-access-pin:v1", "utf8")
    .digest();
}

export function generateClassSignInToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashClassSignInToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateClassPublicCode(): string {
  return Array.from(
    randomBytes(4),
    (byte) => PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length],
  ).join("");
}

export function isClassPublicCode(value: string): boolean {
  return CLASS_PUBLIC_CODE_PATTERN.test(value);
}

export function generateClassAccessPin(): string {
  return Array.from(randomBytes(4), (byte) => String(byte % 10)).join("");
}

export function isClassAccessPin(value: string): boolean {
  return PIN_PATTERN.test(value);
}

export function encryptClassAccessPin(pin: string): string {
  if (!isClassAccessPin(pin)) throw new Error("Invalid class access PIN.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(pin, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function verifyClassAccessPin(encrypted: string, pin: string): boolean {
  if (!isClassAccessPin(pin)) return false;
  try {
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext) return false;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const expected = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]);
    const received = Buffer.from(pin, "utf8");
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  } catch {
    return false;
  }
}

export function decryptClassAccessPin(encrypted: string): string | null {
  try {
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const pin = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return isClassAccessPin(pin) ? pin : null;
  } catch {
    return null;
  }
}
