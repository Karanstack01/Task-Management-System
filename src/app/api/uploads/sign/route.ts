import { NextResponse } from "next/server";
import { generateSignedUploadParams } from "@/lib/cloudinary/cloudinary-service";
import { resolveCloudinaryConfig } from "@/lib/integrations/resolve";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, taskId, fileName, fileSizeBytes, customConfig } = body;

    if (!orgId || !taskId || !fileName || !fileSizeBytes) {
      return NextResponse.json(
        { error: "Missing required fields: orgId, taskId, fileName, fileSizeBytes" },
        { status: 400 }
      );
    }

    // Retrieve tenant's custom Cloudinary credentials if configured
    let resolvedConfig = customConfig;
    if (!resolvedConfig && orgId) {
      resolvedConfig = await resolveCloudinaryConfig(orgId);
    }

    const result = generateSignedUploadParams({
      orgId,
      taskId,
      fileName,
      fileSizeBytes: Number(fileSizeBytes),
      customConfig: resolvedConfig,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
