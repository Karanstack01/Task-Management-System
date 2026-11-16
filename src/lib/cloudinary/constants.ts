// Allowed formats and size limits for CTMS Deliverables & Proof of Work
export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "xlsx",
  "docx",
  "zip",
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface SignedUploadResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

export function validateUploadFile(
  fileName: string,
  fileSizeBytes: number
): { valid: boolean; error?: string } {
  // 1. Check size limit
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 25 MB.`,
    };
  }

  // 2. Check extension
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File format '.${ext || "unknown"}' is not supported. Allowed formats: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

