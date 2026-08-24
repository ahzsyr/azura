import Script from "next/script";
import {
  extractGtmNoscriptIframeSrc,
  extractHeadScriptContent,
} from "@/features/seo/tracking/parse-tracking-snippets";

type Props = {
  containerId: string;
  headSnippet?: string;
  bodySnippet?: string;
};

function gtmInitScript(containerId: string): string {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');`;
}

function resolveHeadScript(containerId: string, headSnippet?: string): string {
  if (headSnippet) {
    const parsed = extractHeadScriptContent(headSnippet);
    if (parsed) return parsed;
  }
  return gtmInitScript(containerId);
}

function resolveBodyIframeSrc(containerId: string, bodySnippet?: string): string {
  if (bodySnippet) {
    const parsed = extractGtmNoscriptIframeSrc(bodySnippet);
    if (parsed) return parsed;
  }
  return `https://www.googletagmanager.com/ns.html?id=${containerId}`;
}

/**
 * GTM head snippet — injected into `<head>` via `beforeInteractive`.
 * Uses saved install snippet when provided, otherwise builds from container ID.
 */
export function GoogleTagManagerHead({ containerId, headSnippet }: Omit<Props, "bodySnippet">) {
  return (
    <Script
      id="google-tag-manager"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: resolveHeadScript(containerId, headSnippet) }}
    />
  );
}

/**
 * GTM noscript fallback — place immediately after the opening `<body>` tag.
 */
export function GoogleTagManagerBody({ containerId, bodySnippet }: Omit<Props, "headSnippet">) {
  return (
    <noscript>
      <iframe
        src={resolveBodyIframeSrc(containerId, bodySnippet)}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}

/** Head + body install for Google Tag Manager. */
export function GoogleTagManager({ containerId, headSnippet, bodySnippet }: Props) {
  return (
    <>
      <GoogleTagManagerHead containerId={containerId} headSnippet={headSnippet} />
      <GoogleTagManagerBody containerId={containerId} bodySnippet={bodySnippet} />
    </>
  );
}
