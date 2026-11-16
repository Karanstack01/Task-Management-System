import {
  validateUploadFile,
  generateSignedUploadParams,
  getDeliverableThumbnailUrl,
  MAX_FILE_SIZE_BYTES,
} from "../src/lib/cloudinary/cloudinary-service";

async function runPhase4Tests() {
  console.log("=================================================");
  console.log("STACKDROVE CTMS — PHASE 4 VERIFICATION TEST SUITE");
  console.log("Cloudinary Storage & Proof-of-Work Pipeline");
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

  // 1. Valid Deliverable Formats
  const pdfVal = validateUploadFile("Quarterly_Report.pdf", 2 * 1024 * 1024);
  assert(pdfVal.valid === true, "PDF format (.pdf) accepted");

  const pngVal = validateUploadFile("screenshot_proof.png", 500 * 1024);
  assert(pngVal.valid === true, "PNG image format (.png) accepted");

  const xlsxVal = validateUploadFile("reconciliation_sheet.xlsx", 1.5 * 1024 * 1024);
  assert(xlsxVal.valid === true, "Spreadsheet format (.xlsx) accepted");

  // 2. Prohibited Executable / Script Formats
  const exeVal = validateUploadFile("malware.exe", 1024);
  assert(exeVal.valid === false && !!exeVal.error, "Executable file (.exe) rejected");

  const batVal = validateUploadFile("script.bat", 2048);
  assert(batVal.valid === false && !!batVal.error, "Batch file (.bat) rejected");

  // 3. File Size Limit (Max 25 MB)
  const exactLimitVal = validateUploadFile("large_archive.zip", MAX_FILE_SIZE_BYTES);
  assert(exactLimitVal.valid === true, "25 MB file within threshold accepted");

  const overLimitVal = validateUploadFile("huge_video.zip", MAX_FILE_SIZE_BYTES + 1024);
  assert(
    overLimitVal.valid === false && !!overLimitVal.error,
    "File exceeding 25 MB limit (>25 MB) rejected"
  );

  // 4. Secure Signed Upload Parameters Generation
  const signRes = generateSignedUploadParams({
    orgId: "org-sd-01",
    taskId: "task-1002",
    fileName: "Migration_RLS_Proof.pdf",
    fileSizeBytes: 1024 * 1024,
  });

  assert(
    signRes.data !== undefined && signRes.error === undefined,
    "Signed upload params generated without errors"
  );
  assert(
    signRes.data?.folder === "stackdrove-ctms/org-sd-01/tasks/task-1002/deliverables",
    "Cloudinary folder path strictly follows 'stackdrove-ctms/{org_id}/tasks/{task_id}/deliverables'"
  );
  assert(
    typeof signRes.data?.signature === "string" && signRes.data.signature.length > 10,
    "Cryptographic HMAC signature generated"
  );
  assert(
    typeof signRes.data?.uploadUrl === "string" && signRes.data.uploadUrl.includes("cloudinary.com"),
    "Target Cloudinary upload endpoint formatted correctly"
  );

  // 5. Cloudinary Thumbnail URL Transformation
  const originalUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
  const transformedUrl = getDeliverableThumbnailUrl(originalUrl, "sample.jpg");
  assert(
    transformedUrl.includes("w_200,h_200,c_fill,q_auto"),
    "Cloudinary image thumbnail transformation injected (w_200,h_200,c_fill,q_auto)"
  );

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("ALL PHASE 4 VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
  }
}

runPhase4Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

