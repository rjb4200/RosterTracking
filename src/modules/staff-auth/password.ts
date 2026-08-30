import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be 128 characters or fewer.");

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(50, "Username must be 50 characters or fewer.")
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Username contains unsupported characters.");

const argonOptions = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export function normalizeUsername(username: string): string {
  return usernameSchema.parse(username);
}

export function validatePassword(password: string): string {
  return passwordSchema.parse(password);
}

export function hashPassword(password: string): Promise<string> {
  return hash(validatePassword(password), argonOptions);
}

export function verifyPassword(
  passwordHash: string,
  candidate: string,
): Promise<boolean> {
  return verify(passwordHash, candidate);
}
