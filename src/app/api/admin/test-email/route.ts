import { NextResponse } from "next/server";
import { verifyEmailConnection, sendEmailMessage } from "@/lib/email/email-service";
import { EmailProvider } from "@/types/database.types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      provider = "MICROSOFT_365",
      toEmail,
      recipientEmail,
      host,
      port,
      user,
      appPassword,
      senderName,
    } = body;

    const emailProvider: EmailProvider = provider === "GOOGLE" ? "GOOGLE" : "MICROSOFT_365";
    const targetEmail = toEmail || recipientEmail;

    const defaultHost = emailProvider === "GOOGLE" ? "smtp.gmail.com" : "smtp.office365.com";
    const defaultPort = 587;
    const defaultSender =
      emailProvider === "GOOGLE" ? "StackDrove (Google Workspace)" : "StackDrove (Microsoft 365)";

    const customConfig = user && appPassword
      ? {
          host: host || defaultHost,
          port: Number(port) || defaultPort,
          user,
          pass: appPassword,
          senderName: senderName || defaultSender,
          provider: emailProvider,
        }
      : undefined;

    // 1. Verify connection
    const testRes = await verifyEmailConnection({
      provider: emailProvider,
      config: customConfig,
    });

    // 2. Dispatch sample test message if target email provided
    if (targetEmail) {
      const isGoogle = emailProvider === "GOOGLE";
      const headline = isGoogle
        ? "Google Workspace / Gmail Email Pipeline Verified"
        : "Microsoft 365 Email Pipeline Verified";
      const providerDesc = isGoogle
        ? "Google Workspace (smtp.gmail.com) via 16-character Google App Password"
        : "Microsoft 365 (smtp.office365.com) via Microsoft App Password";

      await sendEmailMessage({
        to: targetEmail,
        subject: `StackDrove CTMS — ${isGoogle ? "Google Workspace" : "Microsoft 365"} Diagnostic Test`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; border: 1px solid #DFECF7; border-radius: 16px; background-color: #F8FAFC;">
            <div style="display: inline-block; padding: 6px 12px; background-color: #0C132B; color: #D4F20D; border-radius: 8px; font-weight: bold; font-size: 12px; margin-bottom: 12px;">
              STACKDROVE ENTERPRISE CTMS
            </div>
            <h2 style="color: #0C132B; margin-top: 0;">${headline}</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Your enterprise email gateway connection was tested successfully from the StackDrove CTMS Settings console.
            </p>
            <div style="margin: 16px 0; padding: 12px 16px; background-color: #DFECF7; border-radius: 12px; font-size: 13px; color: #0C132B;">
              <strong>Provider Channel:</strong> ${providerDesc}
            </div>
            <p style="color: #2357D6; font-weight: bold; font-size: 13px;">Status: All systems operational.</p>
          </div>
        `,
        templateType: "DIAGNOSTIC_TEST",
        provider: emailProvider,
        customConfig,
      });
    }

    return NextResponse.json(
      {
        success: testRes.success,
        message: testRes.message,
        provider: emailProvider,
        mode: testRes.success ? "VERIFIED" : "FAILED",
        messageId: `<diag-${Date.now()}@${emailProvider.toLowerCase()}.ctms>`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Diagnostic test failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
