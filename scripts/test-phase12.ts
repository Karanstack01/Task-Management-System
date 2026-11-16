import { localDb } from "../src/lib/data/dal";

async function runPhase12Tests() {
  console.log("=================================================");
  console.log("   PHASE 12: MASTER SETTINGS & GOVERNANCE TEST");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const orgId = "org-sd-01";

  // Test 1: Fetch initial system settings
  const initial = await localDb.getSystemSettings(orgId);
  assert(
    !!initial && initial.org_id === orgId,
    `Test 1: Retrieved initial system settings for tenant ${orgId}`
  );

  // Test 2: Update WhatsApp credentials
  const updatedWa = await localDb.updateSystemSettings(orgId, {
    enable_official_wa: true,
    wa_official_phone_id: "phone-test-999",
    wa_official_api_token: "token-test-secret",
    test_mobile_number: "+919876543299",
  });
  assert(
    updatedWa.enable_official_wa === true &&
      updatedWa.wa_official_phone_id === "phone-test-999" &&
      updatedWa.test_mobile_number === "+919876543299",
    `Test 2: Updated WhatsApp official configuration`
  );

  // Test 3: Update Microsoft 365 SMTP credentials
  const updatedSmtp = await localDb.updateSystemSettings(orgId, {
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_user: "dispatch@stackdrove.com",
    sender_display_name: "StackDrove Enterprise CTMS",
  });
  assert(
    updatedSmtp.smtp_user === "dispatch@stackdrove.com" &&
      updatedSmtp.sender_display_name === "StackDrove Enterprise CTMS",
    `Test 3: Updated Microsoft 365 SMTP parameters`
  );

  // Test 4: Update Cloudinary storage credentials
  const updatedCloudinary = await localDb.updateSystemSettings(orgId, {
    cloudinary_cloud_name: "stackdrove-cloud-prod",
    cloudinary_upload_preset: "proofs_prod",
  });
  assert(
    updatedCloudinary.cloudinary_cloud_name === "stackdrove-cloud-prod" &&
      updatedCloudinary.cloudinary_upload_preset === "proofs_prod",
    `Test 4: Updated Cloudinary storage parameters`
  );

  // Test 5: Update SLA parameters
  const updatedSla = await localDb.updateSystemSettings(orgId, {
    default_task_score: 15.0,
    daily_reminder_hour: 10,
    max_revision_gap_days: 7,
    skip_holiday_in_sla: true,
  });
  assert(
    updatedSla.default_task_score === 15.0 &&
      updatedSla.daily_reminder_hour === 10 &&
      updatedSla.max_revision_gap_days === 7,
    `Test 5: Updated SLA and timeline revision rules`
  );

  // Test 6: Update Column Permissions Matrix
  const updatedPerms = await localDb.updateSystemSettings(orgId, {
    column_permissions: {
      priority: { BOSS: true, DELEGATOR: true, DELEGATEE: true }, // Delegatee given priority view
      allocated_score: { BOSS: true, DELEGATOR: true, DELEGATEE: false },
    },
  });
  assert(
    updatedPerms.column_permissions?.priority?.DELEGATEE === true,
    `Test 6: Column permissions matrix updated and verified`
  );

  console.log("\n=================================================");
  console.log(`Phase 12 Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase12Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

