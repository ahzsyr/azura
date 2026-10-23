/**
 * Content-sniffing checks for public form uploads.
 *
 * The extension allowlist is attacker-controlled (a `.png` can contain
 * anything). These checks confirm the bytes actually match one of the allowed
 * formats before the file is written to storage.
 */

export type FormUploadKind = "jpeg" | "png" | "webp" | "gif" | "pdf";

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return Buffer.from(bytes.subarray(start, start + length)).toString("latin1");
}

/** Sniff the real format from magic bytes. Returns null when not allowed. */
export function sniffFormUploadKind(bytes: Uint8Array): FormUploadKind | null {
  if (!bytes || bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" / "GIF89a"
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "gif";

  // WebP: RIFF <size> WEBP
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";

  // PDF: %PDF- (allow a little leading whitespace/junk, like real-world files)
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024));
  if (head.includes("%PDF-")) return "pdf";

  return null;
}

/** Whether the sniffed kind is compatible with the declared extension/MIME. */
export function formUploadKindMatches(kind: FormUploadKind, input: { name: string; type?: string }): boolean {
  const ext = (input.name.toLowerCase().match(/\.[a-z0-9]+$/) ?? [""])[0];
  const type = (input.type ?? "").toLowerCase().split(";")[0]?.trim() ?? "";

  const extOk: Record<FormUploadKind, string[]> = {
    jpeg: [".jpg", ".jpeg"],
    png: [".png"],
    webp: [".webp"],
    gif: [".gif"],
    pdf: [".pdf"],
  };
  if (!extOk[kind].includes(ext)) return false;

  // MIME, when the browser sent one, must not contradict the bytes.
  if (!type || type === "application/octet-stream") return true;
  const mimeOk: Record<FormUploadKind, string[]> = {
    jpeg: ["image/jpeg", "image/jpg", "image/pjpeg"],
    png: ["image/png", "image/x-png"],
    webp: ["image/webp"],
    gif: ["image/gif"],
    pdf: ["application/pdf", "application/x-pdf"],
  };
  return mimeOk[kind].includes(type);
}
