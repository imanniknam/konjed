/** Fail fast in production when the deployment is misconfigured. */
export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = ["DATABASE_URL", "SITE_URL"].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (!/^https:\/\//.test(process.env.SITE_URL!)) console.warn("[env] SITE_URL should be https:// in production (cookies are marked Secure).");
}
