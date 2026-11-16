import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { testEmailConnection } from "@/lib/email/email-service";
import type { EmailProvider } from "@/types/database.types";

const SESSION_COOKIE = "ctms_session";
const ORG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST { provider, toEmail?, orgId?, host?, port?, user?, appPassword?, senderName? }
 * Real SMTP login (+ optional test message). Saved org settings are used unless values are supplied.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  if (!jar.has(SESSION_COOKIE)) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { provider = "MICROSOFT_365", orgId = "org-sd-01", toEmail, recipientEmail, host, port, user, appPassword, senderName } = body;

    if (!ORG_ID_PATTERN.test(orgId)) {
      return NextResponse.json({ success: false, message: "Invalid organization." }, { status: 400 });
    }
    const emailProvider: EmailProvider = provider === "GOOGLE" ? "GOOGLE" : "MICROSOFT_365";
    const to = (toEmail || recipientEmail || "").trim();
    if (to && !EMAIL_PATTERN.test(to)) {
      return NextResponse.json({ success: false, message: "Recipient is not a valid email address." }, { status: 400 });
    }

    const result = await testEmailConnection({
      orgId,
      provider: emailProvider,
      toEmail: to || undefined,
      override: { host, port: port ? Number(port) : undefined, user, pass: appPassword, senderName },
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Email test failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
