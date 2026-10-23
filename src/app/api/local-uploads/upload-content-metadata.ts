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

const FORCE_ATTACHMENT_EXT = new Set([".html", ".htm", ".js", ".mjs", ".xml", ".zip"]);

/**
 * SVG paths that are known site icons and may therefore render inline
 * (favicon, PWA manifest icons, logo marks). Every other SVG is served as an
 * attachment so that direct navigation cannot execute script even if the
 * content sanitizer is bypassed.
 */
export const KNOWN_PUBLIC_ICON_SVG_PATHS: readonly string[] = Object.freeze([
  "/uploads/svg/favicon.svg",
  "/uploads/svg/icon.svg",
  "/uploads/svg/icon-192.svg",
  "/uploads/svg/icon-512.svg",
  "/uploads/svg/apple-touch-icon.svg",
  "/uploads/svg/logo.svg",
  "/uploads/svg/logo-mark.svg",
]);

const knownPublicIconPaths = new Set(KNOWN_PUBLIC_ICON_SVG_PATHS.map((p) => p.toLowerCase()));

/** True for upload URLs allowed to render an SVG inline. */
export function isKnownPublicIconPath(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  return knownPublicIconPaths.has(path);
}

function contentDisposition(filename: string, attachment: boolean): string {
  const safe = filename.replace(/["\\\r\n]/g, "_");
  return `${attachment ? "attachment" : "inline"}; filename="${safe}"`;
}

export function resolveUploadContentMetadata(ext: string, objectUrl?: string) {
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  const forceAttachment =
    FORCE_ATTACHMENT_EXT.has(ext) ||
    (ext === ".svg" && !(objectUrl ? isKnownPublicIconPath(objectUrl) : false));

  return {
    contentType,
    forceAttachment,
    /** Always emitted so direct navigation can never execute SVG script. */
    contentDisposition: objectUrl
      ? contentDisposition(objectUrl.split("/").pop() ?? "download", forceAttachment)
      : undefined,
    // Never set CSP on upload bytes used in <img> — Chrome treats
    // image/svg+xml + CSP as "resource isn't a valid image" for <img>,
    // favicon, and manifest icons. Attachment + nosniff is the control here.
    contentSecurityPolicy: undefined as string | undefined,
  };
}
