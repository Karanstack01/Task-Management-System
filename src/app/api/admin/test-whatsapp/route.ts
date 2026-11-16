import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { testWhatsAppConnection } from "@/lib/whatsapp/whatsapp-service";

const SESSION_COOKIE = "ctms_session";
const ORG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * POST { orgId?, recipientMobile?, metaPhoneId?, metaToken?, gatewayUrl?, gatewayUsername?, gatewayPassword? }
 * Validates the Meta Cloud API credentials and/or the CEOITBOX gateway; sends a real message when a
 * recipient mobile is supplied. Saved org settings are used unless values are supplied.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  if (!jar.has(SESSION_COOKIE)) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { orgId = "org-sd-01", recipientMobile, metaPhoneId, metaToken, gatewayUrl, gatewayUsername, gatewayPassword } = body;

    if (!ORG_ID_PATTERN.test(orgId)) {
      return NextResponse.json({ success: false, message: "Invalid organization." }, { status: 400 });
    }
    if (gatewayUrl && !/^https:\/\//i.test(String(gatewayUrl))) {
      return NextResponse.json({ success: false, message: "Gateway URL must start with https://" }, { status: 400 });
    }

    const result = await testWhatsAppConnection({
      orgId,
      toMobile: recipientMobile,
      override: { metaPhoneId, metaToken, gatewayUrl, gatewayUsername, gatewayPassword },
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WhatsApp test failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
