import { NextResponse } from "next/server";
import { verifyCloudinaryConnection } from "@/lib/cloudinary/cloudinary-service";
import { resolveCloudinaryConfig } from "@/lib/integrations/resolve";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orgId = "org-sd-01", cloudName, apiKey, apiSecret, uploadPreset } = body;

    let configToTest = {
      cloudName,
      apiKey,
      apiSecret,
      uploadPreset,
    };

    // If specific fields not provided, use the organization's saved Cloudinary settings
    if (!configToTest.cloudName && !configToTest.apiKey) {
      configToTest = { ...configToTest, ...((await resolveCloudinaryConfig(orgId)) ?? {}) };
    }

    const result = await verifyCloudinaryConnection(configToTest);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cloudinary connection test failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

