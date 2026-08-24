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
 * Meta Pixel via next/script — uses pasted Events Manager base code when provided.
 */
export function MetaPixel({ pixelId, headSnippet }: Props) {
  const noscriptSrc = extractMetaPixelNoscriptSrc(headSnippet ?? "", pixelId);

  return (
    <>
      <Script id={`meta-pixel-${pixelId}`} strategy="afterInteractive">
        {resolveMetaPixelInitScript(pixelId, headSnippet)}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height={1} width={1} style={{ display: "none" }} src={noscriptSrc} alt="" />
      </noscript>
    </>
  );
}
