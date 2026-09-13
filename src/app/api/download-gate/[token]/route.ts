import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { basename } from "path";
import { consumeDownloadUnlock } from "@/features/forms/download-gate.service";
import { resolveLocalUploadDiskPath } from "@/lib/local-media-files";
import { assertSafeOutboundUrl } from "@/lib/ssrf-guard";

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
    const safe = assertSafeOutboundUrl(url);
    if (!safe.ok) {
      return NextResponse.json({ error: "Invalid asset URL" }, { status: 400 });
    }
    // Only allow same-origin public site URL redirects, not arbitrary remote hosts
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (site && safe.url.origin === new URL(site).origin) {
      return NextResponse.redirect(safe.url.href);
    }
    return NextResponse.json({ error: "Remote asset not allowed" }, { status: 400 });
  }

  const diskPath = resolveLocalUploadDiskPath(url.startsWith("/") ? url : `/${url}`);
  if (!diskPath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(diskPath);
    const filename = asset.filename || basename(diskPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
