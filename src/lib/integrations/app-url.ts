/**
 * Public base URL of this deployment, used for links inside emails / WhatsApp messages.
 * Order: NEXT_PUBLIC_APP_URL -> Vercel production URL -> localhost.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit) && !/YOUR-PROJECT/i.test(explicit)) {
    return explicit.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
