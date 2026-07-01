import { NextResponse } from "next/server";
import { downloadGateUnlockSchema } from "@/features/forms/schemas/form-definition";
import { createDownloadUnlock } from "@/features/forms/download-gate.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = downloadGateUnlockSchema.parse(body);
    const unlock = await createDownloadUnlock({
      mediaAssetId: data.mediaAssetId,
      email: data.email,
      unlockMethod: data.unlockMethod,
      expiryHours: data.expiryHours,
    });
    return NextResponse.json({
      success: true,
      token: unlock.token,
      downloadUrl: `/api/download-gate/${unlock.token}`,
      expiresAt: unlock.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Download gate unlock error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
