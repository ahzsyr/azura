import { NextResponse } from "next/server";
import { appendDebugSessionLog } from "@/lib/debug-session-log.server";

export async function POST(request: Request) {
  if (!process.env.DEBUG_SESSION?.trim()) {
    return NextResponse.json({ ok: false, enabled: false });
  }

  try {
    const body = (await request.json()) as {
      location?: string;
      message?: string;
      hypothesisId?: string;
      runId?: string;
      data?: Record<string, unknown>;
    };

    appendDebugSessionLog({
      location: body.location ?? "client",
      message: body.message ?? "client log",
      hypothesisId: body.hypothesisId,
      runId: body.runId,
      data: body.data,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
