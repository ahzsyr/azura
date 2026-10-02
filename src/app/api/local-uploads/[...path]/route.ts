import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { parseBytesRange } from "@/app/api/local-uploads/parse-bytes-range";
import { uploadCacheControl } from "@/app/api/local-uploads/upload-cache-control";
import { resolveUploadContentMetadata } from "@/app/api/local-uploads/upload-content-metadata";
import { resolveExistingUploadDiskPath } from "@/lib/local-media-files";
import { uploadFallbackUrls } from "@/lib/local-upload-urls";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";

type RouteContext = { params: Promise<{ path: string[] }> };

const NOT_FOUND_HEADERS = { "Cache-Control": "no-store" } as const;

function notFoundJson() {
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: NOT_FOUND_HEADERS });
}

function notFoundEmpty() {
  return new NextResponse(null, { status: 404, headers: NOT_FOUND_HEADERS });
}

function baseHeaders(
  contentType: string,
  size: number,
  filename: string,
  forceAttachment: boolean,
  contentSecurityPolicy?: string,
  isPartial = false,
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": uploadCacheControl(contentType, isPartial),
    "Content-Length": String(size),
    "X-Content-Type-Options": "nosniff",
  };
  if (contentSecurityPolicy) {
    headers["Content-Security-Policy"] = contentSecurityPolicy;
  }
  if (forceAttachment) {
    headers["Content-Disposition"] = `attachment; filename="${filename.replace(/"/g, "")}"`;
  }
  return headers;
}

function isAlwaysPublicUpload(url: string, mediaType?: string | null, mimeType?: string | null) {
  if (extname(url).toLowerCase() === ".svg") return true;
  if (mediaType === "IMAGE" || mediaType === "SVG") return true;
  const mime = mimeType?.toLowerCase().split(";")[0]?.trim() ?? "";
  return mime.startsWith("image/");
}

async function findMediaAssetForUpload(url: string) {
  const filename = basename(url);
  const urls = uploadFallbackUrls(url);
  try {
    return await prisma.mediaAsset.findFirst({
      where: {
        OR: [
          ...(urls.length ? [{ url: { in: urls } }] : []),
          ...(filename
            ? [{ filename }, { url: { endsWith: `/${filename}` } }]
            : []),
        ],
      },
      select: { visibility: true, mediaType: true, url: true, mimeType: true },
    });
  } catch {
    return null;
  }
}

async function assertPublicOrAuthorized(url: string): Promise<NextResponse | null> {
  if (isAlwaysPublicUpload(url)) return null;
  try {
    const asset = await findMediaAssetForUpload(url);
    if (!asset) return null;
    if (isAlwaysPublicUpload(url, asset.mediaType, asset.mimeType)) return null;
    if (asset.visibility === "PUBLIC") return null;
    const session = await auth();
    if (isAdminRole(session?.user?.role)) return null;
    return notFoundJson();
  } catch {
    return null;
  }
}

type ResolvedUpload =
  | { kind: "file"; diskPath: string }
  | { kind: "redirect"; location: string }
  | { kind: "missing" };

async function resolveUploadTarget(url: string): Promise<ResolvedUpload> {
  const diskPath = resolveExistingUploadDiskPath(url);
  if (diskPath) return { kind: "file", diskPath };

  const asset = await findMediaAssetForUpload(url);
  if (asset?.url && /^https?:\/\//i.test(asset.url)) {
    return { kind: "redirect", location: asset.url };
  }
  if (asset?.url?.startsWith("/uploads/") && asset.url !== url) {
    const alt = resolveExistingUploadDiskPath(asset.url);
    if (alt) return { kind: "file", diskPath: alt };
  }
  return { kind: "missing" };
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;
  const target = await resolveUploadTarget(url);

  if (target.kind === "missing") return notFoundJson();
  if (target.kind === "redirect") {
    return NextResponse.redirect(target.location, 302);
  }

  const blocked = await assertPublicOrAuthorized(url);
  if (blocked) return blocked;

  const { diskPath } = target;
  const fileStat = await stat(diskPath);
  const size = fileStat.size;
  const ext = extname(diskPath).toLowerCase();
  const { contentType, forceAttachment, contentSecurityPolicy } =
    resolveUploadContentMetadata(ext);
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
        ...baseHeaders(
          contentType,
          chunkSize,
          filename,
          forceAttachment,
          contentSecurityPolicy,
          true,
        ),
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
    headers: baseHeaders(contentType, size, filename, forceAttachment, contentSecurityPolicy),
  });
}

export async function HEAD(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;
  const target = await resolveUploadTarget(url);

  if (target.kind === "missing") return notFoundEmpty();
  if (target.kind === "redirect") {
    return NextResponse.redirect(target.location, 302);
  }

  const blocked = await assertPublicOrAuthorized(url);
  if (blocked) return blocked;

  const fileStat = await stat(target.diskPath);
  const ext = extname(target.diskPath).toLowerCase();
  const { contentType, forceAttachment, contentSecurityPolicy } =
    resolveUploadContentMetadata(ext);
  const filename = basename(target.diskPath);

  return new NextResponse(null, {
    status: 200,
    headers: baseHeaders(
      contentType,
      fileStat.size,
      filename,
      forceAttachment,
      contentSecurityPolicy,
    ),
  });
}
