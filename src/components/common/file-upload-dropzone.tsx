"use client";

import React, { useState } from "react";
import { Cloud, ShieldCheck } from "lucide-react";
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/cloudinary/constants";
import { TaskAttachment } from "@/types/database.types";
import { notify } from "@/lib/notifications/toast-service";
import { MagneticDropZone } from "@/components/common/magnetic-drop-zone";

interface DropzoneProps {
  taskId: string;
  orgId: string;
  uploadedBy: string;
  onUploadSuccess?: (attachment: TaskAttachment) => void;
  className?: string;
  compact?: boolean;
}

export function FileUploadDropzone({
  taskId,
  orgId,
  uploadedBy,
  onUploadSuccess,
  className = "",
  compact = false,
}: DropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (fileOverride?: File) => {
    const file = fileOverride || selectedFile;
    if (!file) return;
    setUploading(true);
    setProgress(15);

    try {
      // Step 1: Request signed authorization from tenant Cloudinary configuration
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          taskId,
          fileName: file.name,
          fileSizeBytes: file.size,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok || signData.error) {
        throw new Error(signData.error || "Failed to generate signed upload signature");
      }

      setProgress(40);

      // Step 2: Direct browser-to-Cloudinary upload (Zero-Database-Blobs Architecture)
      let fileUrl = `https://res.cloudinary.com/${signData.cloudName}/raw/upload/${signData.publicId}`;
      let publicId = signData.publicId;

      const isLiveApiKey =
        signData.apiKey &&
        !signData.apiKey.includes("dummy") &&
        !signData.apiKey.includes("placeholder");

      if (isLiveApiKey) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signData.apiKey);
        formData.append("timestamp", String(signData.timestamp));
        formData.append("signature", signData.signature);
        formData.append("folder", signData.folder);
        formData.append("public_id", signData.publicId);

        setProgress(70);

        const cloudRes = await fetch(signData.uploadUrl, {
          method: "POST",
          body: formData,
        });

        if (!cloudRes.ok) {
          const errData = await cloudRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Cloudinary direct upload failed");
        }

        const cloudResult = await cloudRes.json();
        fileUrl = cloudResult.secure_url || cloudResult.url;
        publicId = cloudResult.public_id || signData.publicId;
      } else {
        // Fast, deterministic simulation for local development / testing
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setProgress(90);

      // Step 3: Strictly persist metadata reference to the database (0 bytes of file binary stored in DB)
      const attachRes = await fetch("/api/tasks/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          uploadedBy,
          cloudinaryPublicId: publicId,
          fileUrl,
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          attachmentType: "PROOF_OF_WORK",
        }),
      });

      const attachData = await attachRes.json();
      if (!attachRes.ok || attachData.error) {
        throw new Error(attachData.error || "Failed to register attachment metadata");
      }

      setProgress(100);

      notify.upload(file.name, file.size, fileUrl);

      setSelectedFile(null);
      if (onUploadSuccess && attachData.attachment) {
        onUploadSuccess(attachData.attachment);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      notify.error("Upload Failed", { description: msg });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Zero DB Blob Architecture Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-white/10 text-[11px] text-[#0C132B] dark:text-white">
        <div className="flex items-center gap-1.5 font-bold">
          <Cloud className="w-3.5 h-3.5 text-[#2357D6] dark:text-[#60A5FA]" />
          <span>Cloudinary Direct Storage</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2357D6] dark:text-[#60A5FA]">
          <ShieldCheck className="w-3 h-3 text-[#2357D6] dark:text-[#60A5FA]" />
          Zero DB Blobs
        </span>
      </div>

      {/* Magnetic Dropzone */}
      <MagneticDropZone
        accept={ALLOWED_FILE_EXTENSIONS.map((e) => `.${e}`).join(",")}
        maxSize={MAX_FILE_SIZE_BYTES}
        compact={compact}
        onFilesChange={(files) => setSelectedFile(files[0] || null)}
        onUpload={(file) => handleUpload(file)}
        uploading={uploading}
        uploadProgress={progress}
      />
    </div>
  );
}
