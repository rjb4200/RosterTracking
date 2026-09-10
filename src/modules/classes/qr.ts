import QRCode from "qrcode";

function isLocalOrigin(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function getClassSignInBaseUrl(): string {
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const configuredUrl = process.env.NEXTAUTH_URL;
  const productionVercelUrl = vercelUrl ? `https://${vercelUrl}` : undefined;
  const baseUrl =
    (process.env.NODE_ENV === "production" && isLocalOrigin(configuredUrl)
      ? productionVercelUrl
      : configuredUrl) ??
    productionVercelUrl ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "http://localhost:3000");
  if (!baseUrl) {
    throw new Error("Configure NEXTAUTH_URL before generating sign-in access.");
  }
  return baseUrl;
}

export function buildClassSignInUrl(publicCode: string): string {
  const baseUrl = getClassSignInBaseUrl();
  return new URL(`/${publicCode}`, baseUrl).toString();
}

export async function createClassQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2 });
}
