import { NextResponse } from "next/server";
import { localDb } from "@/lib/data/dal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId query parameter" }, { status: 400 });
    }

    const attachments = await localDb.getTaskAttachments(taskId);
    return NextResponse.json({ attachments }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      taskId,
      uploadedBy,
      cloudinaryPublicId,
      fileUrl,
      fileName,
      fileSizeBytes,
      mimeType,
      attachmentType,
    } = body;

    if (!taskId || !cloudinaryPublicId || !fileUrl || !fileName) {
      return NextResponse.json(
        {
          error:
            "Missing required metadata fields: taskId, cloudinaryPublicId, fileUrl, fileName. Note: CTMS policy strictly rejects binary blob uploads directly to the database.",
        },
        { status: 400 }
      );
    }

    // Zero-database-blob policy: Strictly save Cloudinary metadata reference
    const attachment = await localDb.addAttachment({
      taskId,
      uploadedBy,
      cloudinaryPublicId,
      fileUrl,
      fileName,
      fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : undefined,
      mimeType: mimeType || "application/octet-stream",
      attachmentType: attachmentType || "PROOF_OF_WORK",
    });

    return NextResponse.json({ attachment, success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

