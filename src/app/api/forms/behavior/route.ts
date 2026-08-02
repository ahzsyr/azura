import { NextResponse } from "next/server";
import { z } from "zod";
import { recordBehaviorEvent } from "@/features/forms/behavior-analytics.service";

const behaviorEventSchema = z.object({
  schemaId: z.string().min(1),
  type: z.string().min(1),
  sessionId: z.string().optional(),
  bindingId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = behaviorEventSchema.parse(body);
    await recordBehaviorEvent(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
