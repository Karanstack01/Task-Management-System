import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for integration secrets (SMTP app passwords, API tokens) stored at rest.
 *
 * Key source (first available):
 *   1. INTEGRATION_ENCRYPTION_KEY   - recommended: set a long random string in your environment
 *   2. SUPABASE_SERVICE_ROLE_KEY    - stable server-only secret, used as a fallback
 *   3. CRON_SECRET                  - last resort
 * If none is set a development-only key is used (fine locally, NOT for production).
 */
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CRON_SECRET ||
    "ctms-development-only-encryption-key";
  return createHash("sha256").update(raw).digest();
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Returns the plaintext; values that were never encrypted (legacy/plain) are returned as-is. */
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!isEncrypted(stored)) return stored;
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // Key changed or data corrupted: treat as "not set" so the admin is asked to re-enter it.
    return "";
  }
}
