import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { consumeDownloadUnlock } from "@/features/forms/download-gate.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const unlock = await consumeDownloadUnlock(token);
  if (!unlock?.mediaAsset) {
    return NextResponse.json({ error: "Invalid or expired download link" }, { status: 404 });
  }

  const asset = unlock.mediaAsset;
  const url = asset.url;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return NextResponse.redirect(url);
  }

  const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Disposition": `attachment; filename="${asset.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
