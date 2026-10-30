/**
 * Global ZIP size/entry caps for non-theme package imports (apps / extensions).
 * Theme packages use the stricter theme-asset-limits path separately.
 */

export const MAX_PACKAGE_ZIP_COMPRESSED_BYTES = 8 * 1024 * 1024;
export const MAX_PACKAGE_ZIP_ENTRY_COUNT = 64;

export type PackageZipPass1Result =
  | { ok: true }
  | { ok: false; error: string };

export function validatePackageZipPass1(input: {
  compressedBytes: number;
  entryCount: number;
}): PackageZipPass1Result {
  if (input.compressedBytes > MAX_PACKAGE_ZIP_COMPRESSED_BYTES) {
    return {
      ok: false,
      error: `Package ZIP exceeds ${MAX_PACKAGE_ZIP_COMPRESSED_BYTES} bytes compressed`,
    };
  }
  if (input.entryCount > MAX_PACKAGE_ZIP_ENTRY_COUNT) {
    return {
      ok: false,
      error: `Package ZIP exceeds ${MAX_PACKAGE_ZIP_ENTRY_COUNT} entries`,
    };
  }
  return { ok: true };
}
