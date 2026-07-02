import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isCapabilityEnabled } from "@/config/deployment-profile";
import {
  personalizationService,
  type PersonalizationSettings,
} from "@/capabilities/personalization/personalization.service";

export async function GET() {
  if (!isCapabilityEnabled("personalization")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const settings = await personalizationService.get();
    return NextResponse.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isCapabilityEnabled("personalization")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as PersonalizationSettings;
    const saved = await personalizationService.save(body);
    return NextResponse.json({ saved: true, settings: saved });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
