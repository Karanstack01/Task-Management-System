import {
  renderTaskAssignedEmail,
  renderTaskSubmittedEmail,
  renderTaskVerifiedEmail,
} from "../src/lib/email/email-templates";
import {
  dispatchTaskAssignedEmail,
  dispatchTaskSubmittedEmail,
  dispatchTaskVerifiedEmail,
  verifySmtpConnection,
  localNotificationLogs,
} from "../src/lib/email/email-service";

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("STACKDROVE CTMS — PHASE 5 VERIFICATION TEST SUITE");
  console.log("Microsoft 365 Email Dispatch Engine");
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

  // 1. Task Assigned Template Rendering
  const assigned = renderTaskAssignedEmail({
    taskNo: 1042,
    title: "Server Migration & SSL Deployment",
    delegatorName: "Rajesh Sharma",
    priority: "CRITICAL",
    targetDate: "2026-11-05T18:00:00Z",
    shortLink: "https://cbxit.in/t/1042",
  });

  assert(assigned.subject.includes("#1042"), "Assigned email subject includes '#1042'");
  assert(assigned.html.includes("Server Migration & SSL Deployment"), "Assigned email HTML contains task title");
  assert(assigned.html.includes("Rajesh Sharma"), "Assigned email HTML contains delegator name");
  assert(assigned.html.includes("badge-critical"), "Assigned email applies CRITICAL priority badge");

  // 2. Task Submitted Template Rendering
  const submitted = renderTaskSubmittedEmail({
    taskNo: 1042,
    title: "Server Migration & SSL Deployment",
    delegateeName: "Rohan Mehta",
    deliverableName: "Migration_Benchmark.pdf",
    deliverableUrl: "https://res.cloudinary.com/demo/proof.pdf",
    verifyLink: "http://localhost:3000/verify",
  });

  assert(submitted.subject.includes("Verification Needed"), "Submitted email subject indicates verification needed");
  assert(submitted.html.includes("Rohan Mehta"), "Submitted email contains delegatee name");
  assert(submitted.html.includes("Migration_Benchmark.pdf"), "Submitted email links to attached deliverable");

  // 3. Task Verified Template Rendering
  const verified = renderTaskVerifiedEmail({
    taskNo: 1042,
    title: "Server Migration & SSL Deployment",
    score: 10.0,
    delayDays: 0,
    remarks: "Delivered strictly on schedule. Clean audit trail.",
    verifiedByName: "Rajesh Sharma",
  });

  assert(verified.subject.includes("10.0/10"), "Verified email subject reports 10.0/10 score");
  assert(verified.html.includes("10.0"), "Verified email HTML displays score");
  assert(verified.html.includes("Delivered strictly on schedule"), "Verified email contains manager feedback");

  // 4. Dispatch Execution & Notification Audit Logging
  const initialLogsCount = localNotificationLogs.length;

  const res1 = await dispatchTaskAssignedEmail("rohan@stackdrove.com", {
    taskNo: 1042,
    title: "Server Migration & SSL Deployment",
    delegatorName: "Rajesh Sharma",
    priority: "CRITICAL",
    targetDate: "2026-11-05T18:00:00Z",
  });
  assert(res1.success === true, "Task assigned email dispatch succeeded");

  const res2 = await dispatchTaskSubmittedEmail("neha.manager@stackdrove.com", {
    taskNo: 1042,
    title: "Server Migration & SSL Deployment",
    delegateeName: "Rohan Mehta",
    deliverableName: "Migration_Benchmark.pdf",
    deliverableUrl: "https://res.cloudinary.com/demo/proof.pdf",
  });
  assert(res2.success === true, "Task submitted email dispatch succeeded");

  const res3 = await dispatchTaskVerifiedEmail("rohan@stackdrove.com", {
    taskNo: 1042,
    title: "Server Migration & SSL Deployment",
    score: 10.0,
    delayDays: 0,
    remarks: "Delivered strictly on schedule.",
    verifiedByName: "Rajesh Sharma",
  });
  assert(res3.success === true, "Task verified email dispatch succeeded");

  assert(
    localNotificationLogs.length === initialLogsCount + 3,
    "All 3 transactional emails logged into notification audit trail"
  );

  // 5. SMTP Connection Diagnostic Verification
  const diagRes = await verifySmtpConnection();
  assert(diagRes.success === true, "SMTP Diagnostic connection verifier passes operational check");

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL PHASE 5 VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

