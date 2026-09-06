import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export interface PrivateArtifactStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

// The deployment adapter must point at private, durable storage. Local files are
// deliberately only a development fallback and are never served as public URLs.
export function getPrivateArtifactStorage(): PrivateArtifactStorage {
  const bucket = process.env.OFFICIAL_ROSTER_STORAGE_BUCKET;
  const endpoint = process.env.OFFICIAL_ROSTER_STORAGE_ENDPOINT;
  const accessKeyId = process.env.OFFICIAL_ROSTER_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OFFICIAL_ROSTER_STORAGE_SECRET_ACCESS_KEY;
  if (bucket || endpoint || accessKeyId || secretAccessKey) {
    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Official roster S3 storage configuration is incomplete.",
      );
    }
    const client = new S3Client({
      endpoint,
      region: process.env.OFFICIAL_ROSTER_STORAGE_REGION ?? "us-east-2",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    return {
      async put(key, bytes) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: "application/pdf",
            // A random key is expected, and this also prevents accidental replacement.
            IfNoneMatch: "*",
          }),
        );
      },
      async get(key) {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        if (!response.Body)
          throw new Error("Official roster artifact is unavailable.");
        return response.Body.transformToByteArray();
      },
    };
  }
  const root = process.env.OFFICIAL_ROSTER_STORAGE_DIR;
  if (!root) {
    throw new Error(
      "OFFICIAL_ROSTER_STORAGE_DIR is required to store private official rosters.",
    );
  }
  const base = resolve(root);
  return {
    async put(key, bytes) {
      const path = resolve(base, key);
      if (!path.startsWith(`${base}\\`) && path !== base) {
        throw new Error("Invalid official roster artifact key.");
      }
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes, { flag: "wx" });
    },
    async get(key) {
      const path = resolve(base, key);
      if (!path.startsWith(`${base}\\`) && path !== base) {
        throw new Error("Invalid official roster artifact key.");
      }
      return readFile(path);
    },
  };
}
