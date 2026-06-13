import { appendFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug-9fed69.log");

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const line = `${JSON.stringify(body)}\n`;
    await appendFile(LOG_PATH, line, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
