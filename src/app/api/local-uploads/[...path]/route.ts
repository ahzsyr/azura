import { createReadStream, existsSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { parseBytesRange } from "@/app/api/local-uploads/parse-bytes-range";
import { resolveLocalUploadDiskPath } from "@/lib/local-media-files";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "application/octet-stream",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".ogg": "video/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

const FORCE_ATTACHMENT_EXT = new Set([".svg", ".html", ".htm", ".js", ".mjs", ".xml", ".zip"]);

type RouteContext = { params: Promise<{ path: string[] }> };

function baseHeaders(
  contentType: string,
  size: number,
  filename: string,
  forceAttachment: boolean,
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "Content-Length": String(size),
    "X-Content-Type-Options": "nosniff",
  };
  if (forceAttachment) {
    headers["Content-Disposition"] = `attachment; filename="${filename.replace(/"/g, "")}"`;
  }
  return headers;
}

async function assertPublicOrAuthorized(url: string): Promise<NextResponse | null> {
  try {
    const asset = await prisma.mediaAsset.findFirst({
      where: { url },
      select: { visibility: true },
    });
    if (!asset) return null;
    if (asset.visibility === "PUBLIC") return null;
    const session = await auth();
    if (isAdminRole(session?.user?.role)) return null;
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;
  const diskPath = resolveLocalUploadDiskPath(url);

  if (!diskPath || !existsSync(diskPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const blocked = await assertPublicOrAuthorized(url);
  if (blocked) return blocked;

  const fileStat = await stat(diskPath);
  const size = fileStat.size;
  const ext = extname(diskPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const forceAttachment = FORCE_ATTACHMENT_EXT.has(ext);
  const filename = basename(diskPath);

  const range = parseBytesRange(request.headers.get("range"), size);

  if (range === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (range) {
    const { start, end } = range;
    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(diskPath, { start, end });
    const body = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(body, {
      status: 206,
      headers: {
        ...baseHeaders(contentType, chunkSize, filename, forceAttachment),
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
    });
  }

  const handle = await open(diskPath, "r");
  const nodeStream = handle.createReadStream();
  nodeStream.on("close", () => {
    void handle.close();
  });
  const body = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(body, {
    status: 200,
    headers: baseHeaders(contentType, size, filename, forceAttachment),
  });
}

export async function HEAD(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;
  const diskPath = resolveLocalUploadDiskPath(url);

  if (!diskPath || !existsSync(diskPath)) {
    return new NextResponse(null, { status: 404 });
  }

  const blocked = await assertPublicOrAuthorized(url);
  if (blocked) return blocked;

  const fileStat = await stat(diskPath);
  const ext = extname(diskPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const forceAttachment = FORCE_ATTACHMENT_EXT.has(ext);
  const filename = basename(diskPath);

  return new NextResponse(null, {
    status: 200,
    headers: baseHeaders(contentType, fileStat.size, filename, forceAttachment),
  });
}
