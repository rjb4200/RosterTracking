/**
 * The single environment discriminator for the application.
 *
 * Vercel sets `NODE_ENV=production` for preview deployments as well as the
 * production deployment, so `NODE_ENV` cannot tell us whether we are the live
 * application. `VERCEL_ENV` is the authoritative signal where it is present;
 * anywhere else (local development, self-hosting without the Vercel platform)
 * we treat the environment as non-live so that a production *build* never
 * implies a live *deployment*. See the `environment-isolation` capability.
 */
export type AppEnvironment = "production" | "preview" | "development";

export function appEnvironment(): AppEnvironment {
  const value = process.env.VERCEL_ENV;
  if (
    value === "production" ||
    value === "preview" ||
    value === "development"
  ) {
    return value;
  }
  return "development";
}

export function isLiveEnvironment(): boolean {
  return appEnvironment() === "production";
}
