import Script from "next/script";
import {
  extractMetaPixelNoscriptSrc,
  resolveMetaPixelInitScript,
} from "@/modules/marketing/tracking/meta-pixel";

type Props = {
  pixelId: string;
  headSnippet?: string;
};

/**
 * Meta Pixel head snippet — injected into `<head>` via `beforeInteractive`
 * (same placement Meta expects for manual install).
 */
export function MetaPixelHead({ pixelId, headSnippet }: Props) {
  return (
    <Script
      id={`meta-pixel-${pixelId}`}
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: resolveMetaPixelInitScript(pixelId, headSnippet),
      }}
    />
  );
}

/** Meta Pixel noscript fallback — place in the document body. */
export function MetaPixelNoscript({ pixelId, headSnippet }: Props) {
  const noscriptSrc = extractMetaPixelNoscriptSrc(headSnippet ?? "", pixelId);

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img height={1} width={1} style={{ display: "none" }} src={noscriptSrc} alt="" />
    </noscript>
  );
}

/**
 * Meta Pixel via next/script — uses pasted Events Manager base code when provided.
 * Head script is hoisted into `<head>`; noscript stays in the body.
 */
export function MetaPixel({ pixelId, headSnippet }: Props) {
  return (
    <>
      <MetaPixelHead pixelId={pixelId} headSnippet={headSnippet} />
      <MetaPixelNoscript pixelId={pixelId} headSnippet={headSnippet} />
    </>
  );
}
