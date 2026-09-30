import type { ActiveSiteTracking } from "@/features/seo/tracking/resolve-tracking";
import { GoogleAnalytics } from "./google-analytics";
import { GoogleTagManager } from "./google-tag-manager";

type Props = {
  tracking: ActiveSiteTracking | ActiveSiteTracking[] | null;
};

function renderTracking(tracking: ActiveSiteTracking) {
  if (tracking.kind === "gtm") {
    return (
      <GoogleTagManager
        key={`gtm-${tracking.containerId}`}
        containerId={tracking.containerId}
        headSnippet={tracking.headSnippet}
        bodySnippet={tracking.bodySnippet}
      />
    );
  }

  return (
    <GoogleAnalytics
      key={`gtag-${tracking.measurementId}`}
      gaId={tracking.measurementId}
      headSnippet={tracking.headSnippet}
    />
  );
}

/** Renders active Google tag and/or Tag Manager installs on public pages. */
export function SiteTracking({ tracking }: Props) {
  if (!tracking) return null;

  const trackings = Array.isArray(tracking) ? tracking : [tracking];
  if (trackings.length === 0) return null;

  return <>{trackings.map(renderTracking)}</>;
}
