import {
  generateSignedUploadParams,
  verifyCloudinaryConnection,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  validateUploadFile,
  getDeliverableThumbnailUrl,
} from "../src/lib/cloudinary/cloudinary-service";
import { localDb } from "../src/lib/data/dal";

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING CLOUDINARY DIRECT PIPELINE & ZERO-BLOB AUDIT TESTS");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
      failed++;
    }
  }

  // TEST 1: File Validation - Allowed Extensions
  const validExts = ["pdf", "png", "jpg", "jpeg", "xlsx", "docx", "zip"];
  validExts.forEach((ext) => {
    const res = validateUploadFile(`deliverable_sample.${ext}`, 1024 * 500);
    assert(res.valid, `Valid file extension admitted: .${ext}`);
  });

  // TEST 2: File Validation - Disallowed Extension
  const invalidRes = validateUploadFile("malicious_executable.exe", 1024 * 100);
  assert(!invalidRes.valid, "Executable (.exe) file strictly blocked by upload validator");

  // TEST 3: File Validation - Max Size Enforcement (25MB limit)
  const oversizeRes = validateUploadFile("massive_dataset.zip", 26 * 1024 * 1024);
  assert(!oversizeRes.valid, "File exceeding 25MB strictly blocked by size validator");

  // TEST 4: Dynamic Custom Cloudinary Configuration in Signed Upload
  const customConfig = {
    cloudName: "tenant-custom-cloud",
    apiKey: "tenant-api-key-999",
    apiSecret: "tenant-secret-888",
    uploadPreset: "tenant_preset",
  };

  const signResult = generateSignedUploadParams({
    orgId: "org-sd-01",
    taskId: "task-uuid-1001",
    fileName: "final_audit_report.pdf",
    fileSizeBytes: 2048000,
    customConfig,
  });

  assert(!!signResult.data, "Signed upload parameters successfully generated");
  assert(
    signResult.data?.cloudName === "tenant-custom-cloud",
    "Dynamic custom cloud name correctly propagated to upload parameters"
  );
  assert(
    signResult.data?.apiKey === "tenant-api-key-999",
    "Dynamic custom API key correctly propagated to upload parameters"
  );
  assert(
    !!signResult.data?.signature && signResult.data.signature.length === 40,
    "Valid HMAC-SHA1 40-character hexadecimal signature generated"
  );
  assert(
    signResult.data?.uploadUrl === "https://api.cloudinary.com/v1_1/tenant-custom-cloud/auto/upload",
    "Direct browser upload endpoint correctly points to Cloudinary REST API"
  );

  // TEST 5: Verify Cloudinary Connection Diagnostic Engine
  const connTestSim = await verifyCloudinaryConnection({
    cloudName: "test-cloud",
    apiKey: "dummy-key",
    apiSecret: "dummy-secret",
  });
  assert(connTestSim.success, "Simulation mode correctly validates placeholder/dummy credentials");

  // TEST 6: Zero Database Blob Architecture Verification
  // Ensure that adding attachments strictly persists URL metadata and 0 bytes of binary blobs
  const testAttachment = await localDb.addAttachment({
    taskId: "task-uuid-1001",
    uploadedBy: "prof-del-01",
    cloudinaryPublicId: signResult.data?.publicId || "stackdrove-ctms/audit_123",
    fileUrl: `https://res.cloudinary.com/tenant-custom-cloud/raw/upload/${signResult.data?.publicId}`,
    fileName: "final_audit_report.pdf",
    fileSizeBytes: 2048000,
    mimeType: "application/pdf",
    attachmentType: "PROOF_OF_WORK",
  });

  assert(!!testAttachment.id, "Attachment metadata successfully persisted in repository");
  assert(
    testAttachment.file_url.startsWith("https://res.cloudinary.com"),
    "File URL strictly references remote Cloudinary CDN"
  );
  assert(
    typeof testAttachment.file_url === "string",
    "Database record strictly stores string URL reference"
  );
  assert(
    // @ts-expect-error Checking that binary blob does not exist on attachment object
    testAttachment.blob === undefined && testAttachment.data === undefined,
    "Verified 0 bytes of binary file blob stored in database record"
  );

  // TEST 7: Retrieve Attachments for Task
  const taskAttachments = await localDb.getTaskAttachments("task-uuid-1001");
  const found = taskAttachments.find((a) => a.id === testAttachment.id);
  assert(!!found, "getTaskAttachments retrieves metadata reference accurately");

  // TEST 8: Thumbnail Transformation Helper
  const thumbUrl = getDeliverableThumbnailUrl(
    "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "sample.jpg"
  );
  assert(
    thumbUrl.includes("w_200,h_200,c_fill,q_auto"),
    "Cloudinary on-the-fly image transformation thumbnail correctly formatted"
  );

  console.log("==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

