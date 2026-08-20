import { createReadStream, existsSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { parseBytesRange } from "@/app/api/local-uploads/parse-bytes-range";
import { resolveLocalUploadDiskPath } from "@/lib/local-media-files";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".ogg": "video/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

type RouteContext = { params: Promise<{ path: string[] }> };

function baseHeaders(contentType: string, size: number): HeadersInit {
  return {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "Content-Length": String(size),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;
  const diskPath = resolveLocalUploadDiskPath(url);

  if (!diskPath || !existsSync(diskPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileStat = await stat(diskPath);
  const size = fileStat.size;
  const ext = extname(diskPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  const range = parseBytesRange(request.headers.get("range"), size);

  if (range === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
        "Accept-Ranges": "bytes",
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
        ...baseHeaders(contentType, chunkSize),
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
    });
  }

  // Full-file response still advertises Accept-Ranges so Safari can seek to a
  // trailing moov atom (common for QuickTime / phone exports without faststart).
  const handle = await open(diskPath, "r");
  const nodeStream = handle.createReadStream();
  nodeStream.on("close", () => {
    void handle.close();
  });
  const body = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(body, {
    status: 200,
    headers: baseHeaders(contentType, size),
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

  const fileStat = await stat(diskPath);
  const ext = extname(diskPath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return new NextResponse(null, {
    status: 200,
    headers: baseHeaders(contentType, fileStat.size),
  });
}
