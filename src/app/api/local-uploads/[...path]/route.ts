import { createReadStream } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { parseBytesRange } from "@/app/api/local-uploads/parse-bytes-range";
import { resolveUploadContentMetadata } from "@/app/api/local-uploads/upload-content-metadata";
import {
  isUploadVisibleTo,
  uploadResponseCacheControl,
  type UploadAssetLookup,
} from "@/app/api/local-uploads/upload-access-policy";
import { resolveLocalUploadDiskPath } from "@/lib/local-media-files";
import { containsActiveSvgContent } from "@/lib/security/svg-sanitize";
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
  contentDisposition: string | undefined,
  cacheControl: string,
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "Content-Length": String(size),
    "X-Content-Type-Options": "nosniff",
  };
  if (contentDisposition) headers["Content-Disposition"] = contentDisposition;
  return headers;
}

/**
 * One MediaAsset whose stored url equals the request path.
 * Zero rows, more than one row, or a lookup error are all "not found".
 * Filename and endsWith matches are not used: they can select the wrong asset.
 */
async function findMediaAssetForUpload(url: string): Promise<(UploadAssetLookup & { url: string }) | null> {
  if (!url.startsWith("/uploads/") || url.includes("..")) return null;
  try {
    const rows = await prisma.mediaAsset.findMany({
      where: { url },
      select: { visibility: true, mediaType: true, url: true, mimeType: true },
      take: 2,
    });
    if (rows.length !== 1 || !rows[0]?.url) return null;
    return rows[0];
  } catch (error) {
    console.error("[local-uploads] asset lookup failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

type StoredUploadAsset = UploadAssetLookup & { url: string };

async function resolveAuthorization(url: string): Promise<
  | { authorized: true; asset: StoredUploadAsset }
  | { authorized: false }
> {
  const asset = await findMediaAssetForUpload(url);

  // Authorize from visibility before any bytes or remote redirect.
  // PUBLIC is anonymous. PRIVATE and GATED require an admin session.
  if (asset && isUploadVisibleTo(asset, false)) {
    return { authorized: true, asset };
  }

  // Private/gated/missing: only an admin session may read it.
  let isAdmin = false;
  try {
    const session = await auth();
    isAdmin = isAdminRole(session?.user?.role);
  } catch {
    isAdmin = false;
  }
  if (!isUploadVisibleTo(asset, isAdmin)) return { authorized: false };
  return { authorized: true, asset };
}

type ResolvedUpload =
  | { kind: "file"; diskPath: string }
  | { kind: "redirect"; location: string }
  | { kind: "missing" };

async function resolveUploadTarget(url: string, asset: StoredUploadAsset): Promise<ResolvedUpload> {
  const diskPath = resolveLocalUploadDiskPath(url);
  if (diskPath) return { kind: "file", diskPath };
  // Remote bytes are followed only for the same authorized row.
  if (/^https?:\/\//i.test(asset.url)) {
    return { kind: "redirect", location: asset.url };
  }
  return { kind: "missing" };
}

async function svgIsActive(diskPath: string): Promise<boolean | null> {
  try {
    const svg = await readFile(diskPath, "utf8");
    return containsActiveSvgContent(svg);
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;

  // Authorize BEFORE resolving/statting so a missing row and a lookup error
  // produce the same 404 as an existing private file.
  const authz = await resolveAuthorization(url);
  if (!authz.authorized) return notFoundJson();

  const target = await resolveUploadTarget(url, authz.asset);
  if (target.kind === "missing") return notFoundJson();
  if (target.kind === "redirect") {
    return NextResponse.redirect(target.location, 302);
  }

  const { diskPath } = target;
  let fileStat;
  try {
    fileStat = await stat(diskPath);
  } catch {
    return notFoundJson();
  }
  const size = fileStat.size;
  const ext = extname(diskPath).toLowerCase();
  if (ext === ".svg") {
    const active = await svgIsActive(diskPath);
    if (active === null || active) return notFoundJson();
  }
  const meta = resolveUploadContentMetadata(ext, url);
  const contentType = meta.contentType;
  const contentDisposition =
    ext === ".svg" && authz.asset.visibility !== "PUBLIC"
      ? `attachment; filename="${basename(diskPath).replace(/"/g, "")}"`
      : meta.contentDisposition;
  const cacheControl = uploadResponseCacheControl(authz.asset, contentType, false);

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
          contentDisposition,
          uploadResponseCacheControl(authz.asset, contentType, true),
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
    headers: baseHeaders(contentType, size, contentDisposition, cacheControl),
  });
}

export async function HEAD(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const rel = path.join("/");
  const url = `/uploads/${rel}`;

  const authz = await resolveAuthorization(url);
  if (!authz.authorized) return notFoundEmpty();

  const target = await resolveUploadTarget(url, authz.asset);
  if (target.kind === "missing") return notFoundEmpty();
  if (target.kind === "redirect") {
    return NextResponse.redirect(target.location, 302);
  }

  let fileStat;
  try {
    fileStat = await stat(target.diskPath);
  } catch {
    return notFoundEmpty();
  }
  const ext = extname(target.diskPath).toLowerCase();
  if (ext === ".svg") {
    const active = await svgIsActive(target.diskPath);
    if (active === null || active) return notFoundEmpty();
  }
  const meta = resolveUploadContentMetadata(ext, url);
  const contentType = meta.contentType;
  const contentDisposition =
    ext === ".svg" && authz.asset.visibility !== "PUBLIC"
      ? `attachment; filename="${basename(target.diskPath).replace(/"/g, "")}"`
      : meta.contentDisposition;

  return new NextResponse(null, {
    status: 200,
    headers: baseHeaders(
      contentType,
      fileStat.size,
      contentDisposition,
      uploadResponseCacheControl(authz.asset, contentType, false),
    ),
  });
}
