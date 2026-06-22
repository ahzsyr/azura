import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { aiCapability } from "@/capabilities/ai";
import { isCapabilityEnabled } from "@/config/deployment-profile";

export async function POST() {
  if (!isCapabilityEnabled("ai")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireAdmin();
    const result = await aiCapability.processJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process translation jobs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
