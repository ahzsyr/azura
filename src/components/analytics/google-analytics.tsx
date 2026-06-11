import Script from "next/script";

type Props = {
  gaId: string;
};

const DEBUG_ENDPOINT =
  "http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";

function probeGaLog(message: string, data: Record<string, unknown>, hypothesisId: string) {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3353e0",
      },
      body: JSON.stringify({
        sessionId: "3353e0",
        runId: "pre-fix",
        hypothesisId,
        location: "google-analytics.tsx",
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
}

/**
 * Google Analytics via next/script — deferred until after idle to avoid interfering
 * with React streaming hydration.
 *
 * `ERR_BLOCKED_BY_CLIENT` on `google-analytics.com/mp/collect` is from ad blockers /
 * browser privacy tools. It does not affect page render — only analytics collection.
 */
export function GoogleAnalytics({ gaId }: Props) {
  const initScript = `
    window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','${gaId}',{send_page_view:true});
    window.__AZ_GA_READY=true;
  `;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="lazyOnload"
        onLoad={() => probeGaLog("gtag script loaded", { gaId }, "H6")}
        onError={() => probeGaLog("gtag script blocked or failed", { gaId }, "H6")}
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {initScript}
      </Script>
    </>
  );
}
