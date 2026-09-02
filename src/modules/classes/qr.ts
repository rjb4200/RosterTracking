import QRCode from "qrcode";

export function getClassSignInBaseUrl(): string {
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (vercelUrl ? `https://${vercelUrl}` : undefined) ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "http://localhost:3000");
  if (!baseUrl) {
    throw new Error("Configure NEXTAUTH_URL before generating sign-in access.");
  }
  return baseUrl;
}

export function buildClassSignInUrl(rawToken: string): string {
  const baseUrl = getClassSignInBaseUrl();
  return new URL(`/sign-in/${rawToken}`, baseUrl).toString();
}

export async function createClassQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2 });
}
