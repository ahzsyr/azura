/**
 * Pure ZIP pass-1 limits for theme package assets (M7.2).
 * Call before any storeUploadedFile — zero uploads in this module.
 */
export const MAX_FONT_FACES = 8;
/** logo + favicon + up to MAX_FONT_FACES font files */
export const MAX_THEME_ASSET_BINARIES = 2 + MAX_FONT_FACES;
export const MAX_THEME_ZIP_COMPRESSED_BYTES = 12 * 1024 * 1024;
export const MAX_THEME_ZIP_UNCOMPRESSED_BYTES = 24 * 1024 * 1024;
export const MAX_THEME_ZIP_ENTRY_COUNT = 32;

export const THEME_ASSET_PATH =
  /^(assets\/logo\.(png|jpe?g|webp|svg)|assets\/favicon\.(png|webp|svg|ico)|fonts\/[A-Za-z0-9._-]+\.(woff2|woff|ttf|otf))$/;

export function isThemeAssetZipPath(name: string): boolean {
  return THEME_ASSET_PATH.test(name);
}

export type ThemeZipPass1Input = {
  /** Compressed archive size (bytes of the ZIP file). */
  compressedBytes: number;
  entries: Array<{ name: string; uncompressedBytes: number }>;
};

export type ThemeZipPass1Result =
  | { ok: true; assetEntryNames: string[] }
  | { ok: false; errors: string[] };

/** Pass 1: aggregate limits + asset path shape. No I/O. */
export function validateThemeZipPass1(input: ThemeZipPass1Input): ThemeZipPass1Result {
  const errors: string[] = [];
  if (input.compressedBytes > MAX_THEME_ZIP_COMPRESSED_BYTES) {
    errors.push(
      `theme ZIP compressed size exceeds ${MAX_THEME_ZIP_COMPRESSED_BYTES} bytes`,
    );
  }
  if (input.entries.length > MAX_THEME_ZIP_ENTRY_COUNT) {
    errors.push(`theme ZIP has more than ${MAX_THEME_ZIP_ENTRY_COUNT} entries`);
  }

  let uncompressed = 0;
  const assetEntryNames: string[] = [];
  for (const entry of input.entries) {
    uncompressed += entry.uncompressedBytes;
    if (uncompressed > MAX_THEME_ZIP_UNCOMPRESSED_BYTES) {
      errors.push(
        `theme ZIP uncompressed total exceeds ${MAX_THEME_ZIP_UNCOMPRESSED_BYTES} bytes`,
      );
      break;
    }
    if (isThemeAssetZipPath(entry.name)) {
      assetEntryNames.push(entry.name);
    }
  }

  if (assetEntryNames.length > MAX_THEME_ASSET_BINARIES) {
    errors.push(
      `theme ZIP has more than ${MAX_THEME_ASSET_BINARIES} asset binaries (max ${MAX_FONT_FACES} fonts + logo + favicon)`,
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, assetEntryNames };
}
