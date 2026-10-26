/**
 * Minimal typings for the `qrcode` package (it does not ship types).
 *
 * Only the server-side `toString` renderer is declared here. If the package
 * ever gains bundled types, this file can be deleted.
 */
declare module "qrcode" {
  export type QrErrorCorrectionLevel = "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";

  export type QrColor = {
    dark?: string;
    light?: string;
  };

  export type QrToStringOptions = {
    version?: number;
    errorCorrectionLevel?: QrErrorCorrectionLevel;
    maskPattern?: number;
    toSJISFunc?: (codePoint: string) => number;
    margin?: number;
    scale?: number;
    small?: boolean;
    width?: number;
    color?: QrColor;
    type?: "svg" | "terminal" | "utf8";
  };

  export function toString(text: string, options?: QrToStringOptions): Promise<string>;
  export function toString(
    text: string,
    options: QrToStringOptions,
    callback: (error: Error | null | undefined, svg: string) => void,
  ): void;
}
