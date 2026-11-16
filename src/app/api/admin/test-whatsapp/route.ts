import { NextResponse } from "next/server";
import { dispatchWhatsAppAlert } from "@/lib/whatsapp/whatsapp-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, recipientMobile, recipientName, testMessage } = body;

    if (!recipientMobile) {
      return NextResponse.json(
        { error: "Recipient mobile number is required" },
        { status: 400 }
      );
    }

    const message =
      testMessage ||
      `*StackDrove CTMS WhatsApp Gateway Diagnostic*\n` +
      `Your WhatsApp alert pipeline is verified and operational.\n` +
      `Timestamp: ${new Date().toLocaleString()}`;

    const result = await dispatchWhatsAppAlert({
      orgId: orgId || "org-sd-01",
      recipientMobile,
      recipientName: recipientName || "Valued Team Member",
      message,
      templateType: "DIAGNOSTIC",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "WhatsApp test failed";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

