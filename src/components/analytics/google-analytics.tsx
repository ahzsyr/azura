import Script from "next/script";

type Props = {
  gaId: string;
};

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
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {initScript}
      </Script>
    </>
  );
}
