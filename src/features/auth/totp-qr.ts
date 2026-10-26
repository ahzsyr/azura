import "server-only";

import QRCode from "qrcode";

/**
 * Render a TOTP `otpauth://` provisioning URI as a scannable QR code.
 *
 * Returned as an inline SVG (not a raster data URL) because:
 * - vector output stays crisp at any size and is far smaller over the wire,
 * - it scans reliably at small pixel sizes in the admin panel,
 * - it is generated on the server, so the QR always encodes exactly the
 *   `otpauth` URI built by the TOTP service — the image and the secret can
 *   never drift apart.
 */
export async function renderTotpQrSvg(otpauthUrl: string): Promise<string> {
  return QRCode.toString(otpauthUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    // 4-module quiet zone is required by the QR spec for reliable scanning.
    margin: 4,
    width: 224,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
