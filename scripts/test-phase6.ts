import { generateShortUrl } from "../src/lib/whatsapp/shortener";
import {
  formatTaskAssignedMessage,
  formatTaskSubmittedMessage,
  formatTaskVerifiedMessage,
  formatTaskReminderMessage,
  dispatchWhatsAppAlert,
  localWhatsAppNotificationLogs,
} from "../src/lib/whatsapp/whatsapp-service";

async function runPhase6Tests() {
  console.log("=================================================");
  console.log("STACKDROVE CTMS — PHASE 6 VERIFICATION TEST SUITE");
  console.log("CEOITBOX & Official Meta WhatsApp Pipeline");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Dynamic URL Shortener
  const longUrl = "https://ctms.stackdrove.com/tasks/task-uuid-1002/view?org=org-sd-01";
  const shortUrl = await generateShortUrl(longUrl);
  assert(
    typeof shortUrl === "string" && shortUrl.startsWith("http") && shortUrl.length < longUrl.length,
    `URL shortener produces compact link: ${shortUrl}`
  );

  // 2. Message Formatters
  const assignedMsg = formatTaskAssignedMessage({
    taskNo: 1002,
    title: "Quarterly Audit",
    dueDate: "2026-11-05",
    delegator: "Rajesh Sharma",
    shortLink: shortUrl,
  });
  assert(assignedMsg.includes("*New Task Assigned: #1002*"), "Assigned message includes bold task header");
  assert(assignedMsg.includes("*Title:* Quarterly Audit"), "Assigned message includes title");
  assert(assignedMsg.includes(shortUrl), "Assigned message includes short link");

  const submittedMsg = formatTaskSubmittedMessage({
    taskNo: 1002,
    title: "Quarterly Audit",
    delegatee: "Rohan Mehta",
    shortLink: shortUrl,
  });
  assert(submittedMsg.includes("Awaiting Verification"), "Submitted message includes verification notice");
  assert(submittedMsg.includes("Rohan Mehta"), "Submitted message includes delegatee name");

  const verifiedMsg = formatTaskVerifiedMessage({
    taskNo: 1002,
    score: 10.0,
    remarks: "Delivered strictly on time",
  });
  assert(verifiedMsg.includes("*Score Awarded:* 10.0/10"), "Verified message includes 10.0/10 score");
  assert(verifiedMsg.includes("Delivered strictly on time"), "Verified message includes remarks");

  const reminderMsg = formatTaskReminderMessage({
    title: "Quarterly Audit",
    priority: "HIGH",
    shortLink: shortUrl,
  });
  assert(reminderMsg.includes("*Task Reminder: Due Today*"), "Reminder message includes headline");
  assert(reminderMsg.includes("*Priority:* HIGH"), "Reminder message includes priority");

  // 3. Dispatch & Audit Logging
  const initialLogsCount = localWhatsAppNotificationLogs.length;

  const dispatch1 = await dispatchWhatsAppAlert({
    orgId: "org-sd-01",
    recipientMobile: "+919876543210",
    recipientName: "Rohan Mehta",
    message: assignedMsg,
    templateType: "TASK_ASSIGNED",
  });
  assert(dispatch1.success === true, "Task assigned WhatsApp alert dispatches successfully");

  const dispatch2 = await dispatchWhatsAppAlert({
    orgId: "org-sd-01",
    recipientMobile: "+919876543211",
    recipientName: "Rajesh Sharma",
    message: submittedMsg,
    templateType: "TASK_SUBMITTED",
  });
  assert(dispatch2.success === true, "Task submitted WhatsApp alert dispatches successfully");

  const dispatch3 = await dispatchWhatsAppAlert({
    orgId: "org-sd-01",
    recipientMobile: "+919876543210",
    recipientName: "Rohan Mehta",
    message: verifiedMsg,
    templateType: "TASK_VERIFIED",
  });
  assert(dispatch3.success === true, "Task verified WhatsApp alert dispatches successfully");

  assert(
    localWhatsAppNotificationLogs.length === initialLogsCount + 3,
    "All 3 transactional WhatsApp alerts recorded in notification audit log"
  );
  assert(
    ["META_OFFICIAL", "CEOITBOX_GATEWAY", "SIMULATED_LOCAL"].includes(dispatch1.channel),
    `Dispatch identified with valid channel tag (${dispatch1.channel})`
  );

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL PHASE 6 VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
  }
}

runPhase6Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

