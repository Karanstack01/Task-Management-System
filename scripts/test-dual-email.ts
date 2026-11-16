import { localDb } from "../src/lib/data/dal";
import {
  sendEmailMessage,
  verifyEmailConnection,
  dispatchTaskAssignedEmail,
  localNotificationLogs,
} from "../src/lib/email/email-service";

async function runDualEmailVerification() {
  console.log("================================================================================");
  console.log("   STACKDROVE CTMS: DUAL EMAIL INTEGRATION (GOOGLE & MICROSOFT) TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  const orgId = "org-sd-01";

  // 1. Initial State Check
  const initialSettings = await localDb.getSystemSettings(orgId);
  assert(
    initialSettings.smtp_host === "smtp.office365.com",
    "1. Microsoft 365 default SMTP host configured (smtp.office365.com)"
  );
  assert(
    initialSettings.email_provider === "MICROSOFT_365" || initialSettings.email_provider === undefined,
    "2. Default email provider initialized"
  );

  // 2. Configure Google Workspace Email ID & App Password
  const testGoogleEmail = "alerts.stackdrove@gmail.com";
  const testGoogleAppPass = "abcd efgh ijkl mnop";
  const testGoogleDisplay = "StackDrove Google Dispatcher";

  await localDb.updateSystemSettings(orgId, {
    email_provider: "GOOGLE",
    google_smtp_user: testGoogleEmail,
    google_smtp_app_password: testGoogleAppPass,
    google_sender_display_name: testGoogleDisplay,
  });

  const updatedGoogle = await localDb.getSystemSettings(orgId);
  assert(
    updatedGoogle.google_smtp_user === testGoogleEmail,
    "3. Google Workspace Email ID successfully saved and persisted"
  );
  assert(
    updatedGoogle.google_smtp_app_password === testGoogleAppPass,
    "4. Google 16-character App Password successfully saved and persisted"
  );
  assert(
    updatedGoogle.google_sender_display_name === testGoogleDisplay,
    "5. Google sender display name saved successfully"
  );
  assert(
    updatedGoogle.email_provider === "GOOGLE",
    "6. Active email provider switched to GOOGLE"
  );

  // 3. Verify Microsoft 365 Settings remain independent and intact
  assert(
    updatedGoogle.smtp_user === "notifications@stackdrove.com",
    "7. Microsoft 365 credentials remain completely separate and unmutated"
  );

  // 4. Update Microsoft 365 Settings independently
  const testMsEmail = "msoffice@stackdrove.com";
  const testMsPass = "ms-app-secret-password-123";

  await localDb.updateSystemSettings(orgId, {
    smtp_user: testMsEmail,
    smtp_app_password: testMsPass,
    email_provider: "MICROSOFT_365",
  });

  const updatedMs = await localDb.getSystemSettings(orgId);
  assert(
    updatedMs.smtp_user === testMsEmail,
    "8. Microsoft 365 sender email updated independently"
  );
  assert(
    updatedMs.smtp_app_password === testMsPass,
    "9. Microsoft 365 app password updated independently"
  );
  assert(
    updatedMs.google_smtp_user === testGoogleEmail,
    "10. Google Workspace credentials remained intact after Microsoft update"
  );
  assert(
    updatedMs.email_provider === "MICROSOFT_365",
    "11. Active email provider switched to MICROSOFT_365"
  );

  // 5. Test Google Connection Verification
  const googleConn = await verifyEmailConnection({
    provider: "GOOGLE",
    config: {
      host: "smtp.gmail.com",
      port: 587,
      user: testGoogleEmail,
      pass: testGoogleAppPass,
      senderName: testGoogleDisplay,
      provider: "GOOGLE",
    },
  });
  assert(
    googleConn.success && googleConn.provider === "GOOGLE",
    "12. Google Workspace SMTP connection verification passed"
  );

  // 6. Test Microsoft 365 Connection Verification
  const msConn = await verifyEmailConnection({
    provider: "MICROSOFT_365",
    config: {
      host: "smtp.office365.com",
      port: 587,
      user: testMsEmail,
      pass: testMsPass,
      senderName: "StackDrove CTMS MS",
      provider: "MICROSOFT_365",
    },
  });
  assert(
    msConn.success && msConn.provider === "MICROSOFT_365",
    "13. Microsoft 365 SMTP connection verification passed"
  );

  // 7. Dispatch Transactional Task Assigned Email via GOOGLE
  const googleDispatch = await dispatchTaskAssignedEmail(
    "engineer@stackdrove.com",
    {
      taskNo: 2001,
      title: "Deploy Microservice Cluster",
      delegatorName: "Neha Gupta",
      targetDate: "2026-11-05 18:00",
      priority: "HIGH",
    },
    "GOOGLE"
  );
  assert(
    googleDispatch.success,
    "14. Transactional email successfully dispatched via GOOGLE channel"
  );

  // 8. Dispatch Transactional Task Assigned Email via MICROSOFT_365
  const msDispatch = await dispatchTaskAssignedEmail(
    "engineer@stackdrove.com",
    {
      taskNo: 2002,
      title: "Quarterly Compliance Audit",
      delegatorName: "Vikram Malhotra",
      targetDate: "2026-11-06 18:00",
      priority: "CRITICAL",
    },
    "MICROSOFT_365"
  );
  assert(
    msDispatch.success,
    "15. Transactional email successfully dispatched via MICROSOFT_365 channel"
  );

  // 9. Verify Notification Audit Log
  const latestLogs = localNotificationLogs.slice(0, 2);
  assert(
    latestLogs.some((l) => l.provider === "GOOGLE") &&
      latestLogs.some((l) => l.provider === "MICROSOFT_365"),
    "16. Notification audit logger accurately recorded separate Google and Microsoft dispatches"
  );

  console.log("\n================================================================================");
  console.log(`   DUAL EMAIL VERIFICATION SUMMARY: ${passed} PASSED, ${total - passed} FAILED (${Math.round((passed / total) * 100)}% PASS RATE)`);
  console.log("================================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runDualEmailVerification().catch((err) => {
  console.error("Test execution threw exception:", err);
  process.exit(1);
});
