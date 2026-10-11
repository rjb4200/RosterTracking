import QRCode from "qrcode";

import { appEnvironment, isLiveEnvironment } from "@/server/environment";

function isLocalOrigin(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

/**
 * The base URL for a class sign-in link or QR code.
 *
 * Only the live environment may substitute a platform-provided production host
 * for a missing or localhost canonical origin. Every other environment uses its
 * own configured origin and never borrows the production domain, so a
 * development or preview deployment cannot emit links that point at live.
 */
export function getClassSignInBaseUrl(): string {
  const configuredUrl = process.env.NEXTAUTH_URL;

  if (isLiveEnvironment()) {
    const vercelUrl =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    const productionVercelUrl = vercelUrl ? `https://${vercelUrl}` : undefined;
    const baseUrl = isLocalOrigin(configuredUrl)
      ? productionVercelUrl
      : (configuredUrl ?? productionVercelUrl);
    if (!baseUrl) {
      throw new Error(
        "Configure NEXTAUTH_URL before generating sign-in access.",
      );
    }
    return baseUrl;
  }

  if (configuredUrl) return configuredUrl;
  if (appEnvironment() === "development") return "http://localhost:3000";
  throw new Error("Configure NEXTAUTH_URL before generating sign-in access.");
}

export function buildClassSignInUrl(publicCode: string): string {
  const baseUrl = getClassSignInBaseUrl();
  return new URL(`/${publicCode}`, baseUrl).toString();
}

export async function createClassQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2 });
}
