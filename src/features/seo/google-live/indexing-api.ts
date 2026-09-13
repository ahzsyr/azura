import "server-only";

import { formatGoogleApiError } from "./google-api-error";
import { GOOGLE_INDEXING_CONFIGURE_HREF } from "@/features/seo/integrations/indexing-api-config";
import { resolveIndexableUrl } from "@/features/seo/resolve-indexable-url";
import {
  getServiceAccountAccessToken,
  resolveServiceAccountClientEmail,
} from "./service-account";
import {
  graphHasIndexingApiEligibleType,
  IndexingApiNotEligibleError,
} from "./indexing-api-eligibility";

export { IndexingApiNotEligibleError, graphHasIndexingApiEligibleType } from "./indexing-api-eligibility";

function pathnameFromUrl(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}

/**
 * Google Indexing API may only notify JobPosting / BroadcastEvent URLs.
 * All other entity types must use GSC sitemap ping + IndexNow.
 */
export async function assertIndexingApiEligible(url: string): Promise<void> {
  const { buildStructuredDataResult } = await import(
    "@/features/seo/components/structured-data-graph"
  );
  const result = await buildStructuredDataResult({
    pathname: pathnameFromUrl(url),
    canonicalUrl: url,
  });
  if (!graphHasIndexingApiEligibleType(result?.graph ?? null)) {
    throw new IndexingApiNotEligibleError(url);
  }
}

export type IndexingApiResult = {
  url: string;
  state: "submitted" | "failed";
  live: true;
  notificationType: "URL_UPDATED" | "URL_DELETED";
  response?: Record<string, unknown>;
  configureHref: string;
};

export async function publishUrlToIndexingApi(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED",
): Promise<IndexingApiResult> {
  const indexableUrl = await resolveIndexableUrl(url);
  await assertIndexingApiEligible(indexableUrl);
  const token = await getServiceAccountAccessToken([
    "https://www.googleapis.com/auth/indexing",
  ]);

  const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ url: indexableUrl, type }),
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    const serviceAccountEmail = await resolveServiceAccountClientEmail();
    throw new Error(
      formatGoogleApiError(response.status, text, {
        apiLabel: "Google Indexing API",
        serviceAccountEmail,
        extraHint:
          "Also verify the service account is added as an Owner in Search Console for your site property.",
      }),
    );
  }

  return {
    url: indexableUrl,
    state: "submitted",
    live: true,
    notificationType: type,
    response: parsed,
    configureHref: GOOGLE_INDEXING_CONFIGURE_HREF,
  };
}
