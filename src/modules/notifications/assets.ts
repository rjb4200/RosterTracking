import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { EmailAttachment } from "./client";
import { LOGO_CONTENT_ID, LOGO_FILENAME } from "./layout";

/**
 * Loads the optimized department logo as an inline (CID) attachment. The header
 * references it as `cid:wfd-logo`, so every message built from the shared shell
 * must include this attachment.
 */
export async function loadLogoAttachment(): Promise<EmailAttachment> {
  const bytes = await readFile(
    join(
      process.cwd(),
      "src",
      "modules",
      "notifications",
      "assets",
      LOGO_FILENAME,
    ),
  );
  return {
    filename: LOGO_FILENAME,
    bytes,
    contentType: "image/png",
    contentId: LOGO_CONTENT_ID,
  };
}
