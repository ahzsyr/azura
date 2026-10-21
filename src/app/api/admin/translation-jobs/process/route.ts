import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { aiCapability } from "@/capabilities/ai";
import { isCapabilityEnabled } from "@/config/deployment-profile";

export async function POST(req: NextRequest) {
  if (!isCapabilityEnabled("ai")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return defineApiRoute({
    access: "admin",
    skipAdminLifecycleGate: true,
    verifySessionVersion: false,
    handler: async () => {
      const result = await aiCapability.processJobs();
      if (result.error) {
        return NextResponse.json({ success: false, ...result }, { status: 422 });
      }
      return NextResponse.json({ success: true, ...result });
    },
  })(req);
}
