import Script from "next/script";
import {
  extractGtagScriptSrc,
  extractHeadScriptContent,
  extractMeasurementIdFromSnippet,
} from "@/features/seo/tracking/parse-tracking-snippets";

type Props = {
  gaId: string;
  headSnippet?: string;
};

function defaultInitScript(gaId: string): string {
  return `
    window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','${gaId}',{send_page_view:true});
    window.__AZ_GA_READY=true;
  `;
}

function resolveGtagScriptSrc(gaId: string, headSnippet?: string): string {
  if (headSnippet) {
    const parsed = extractGtagScriptSrc(headSnippet);
    if (parsed) return parsed;
  }
  return `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
}

function resolveInitScript(gaId: string, headSnippet?: string): string {
  if (headSnippet) {
    const parsed = extractHeadScriptContent(headSnippet);
    if (parsed) return parsed;
    const extractedId = extractMeasurementIdFromSnippet(headSnippet);
    if (extractedId) return defaultInitScript(extractedId);
  }
  return defaultInitScript(gaId);
}

/**
 * Google Analytics via next/script — uses saved install snippet when provided.
 */
export function GoogleAnalytics({ gaId, headSnippet }: Props) {
  return (
    <>
      <Script src={resolveGtagScriptSrc(gaId, headSnippet)} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {resolveInitScript(gaId, headSnippet)}
      </Script>
    </>
  );
}
