import Script from "next/script";

type Props = {
  gaId: string;
};

/**
 * Google Analytics via next/script — loads after hydration without blocking LCP.
 *
 * DevTools may show `POST google-analytics.com/mp/collect` with ERR_BLOCKED_BY_CLIENT
 * when ad blockers or browser privacy tools are active. That is expected and does not
 * affect page render, builder, or navigation — only analytics collection may be skipped.
 */
export function GoogleAnalytics({ gaId }: Props) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
      </Script>
    </>
  );
}
