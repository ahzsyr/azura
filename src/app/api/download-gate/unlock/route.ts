import { NextResponse } from "next/server";
import { downloadGateUnlockSchema } from "@/features/forms/schemas/form-definition";
import { createDownloadUnlock } from "@/features/forms/download-gate.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { EmailDomainError, assertDeliverableEmail } from "@/lib/security/email-domain.server";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `download-unlock:${ip}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const data = downloadGateUnlockSchema.parse(body);
    if (data.email) await assertDeliverableEmail(data.email);

    if (data.unlockMethod === "EXTERNAL") {
      return NextResponse.json({ error: "Invalid unlock method" }, { status: 400 });
    }

    if (!data.mediaAssetId?.trim()) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const unlock = await createDownloadUnlock({
      mediaAssetId: data.mediaAssetId,
      email: data.email,
      unlockMethod: data.unlockMethod,
      expiryHours: data.expiryHours,
      submissionId: data.submissionId,
      subscriberId: data.subscriberId,
    });

    return NextResponse.json({
      success: true,
      token: unlock.rawToken,
      downloadUrl: `/api/download-gate/${unlock.rawToken}`,
      expiresAt: unlock.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof EmailDomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Download gate unlock error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
