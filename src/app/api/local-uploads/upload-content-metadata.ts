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

export function resolveUploadContentMetadata(ext: string) {
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return {
    contentType,
    forceAttachment: FORCE_ATTACHMENT_EXT.has(ext),
    // Never set CSP on upload bytes. Chrome treats image/svg+xml + CSP as
    // "resource isn't a valid image" for <img>, favicon, and manifest icons.
    contentSecurityPolicy: undefined as string | undefined,
  };
}