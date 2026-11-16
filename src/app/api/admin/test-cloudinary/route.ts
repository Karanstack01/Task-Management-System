import { NextResponse } from "next/server";
import { verifyCloudinaryConnection } from "@/lib/cloudinary/cloudinary-service";
import { localDb } from "@/lib/data/dal";

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

    // If specific fields not provided, look up from org system settings
    if (!configToTest.cloudName && !configToTest.apiKey) {
      const settings = await localDb.getSystemSettings(orgId);
      if (settings) {
        configToTest = {
          cloudName: settings.cloudinary_cloud_name || undefined,
          apiKey: settings.cloudinary_api_key || undefined,
          apiSecret: settings.cloudinary_api_secret || undefined,
          uploadPreset: settings.cloudinary_upload_preset || undefined,
        };
      }
    }

    const result = await verifyCloudinaryConnection(configToTest);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cloudinary connection test failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

