import "server-only";

import { formatGoogleApiError } from "./google-api-error";
import { GOOGLE_INDEXING_CONFIGURE_HREF } from "@/features/seo/integrations/indexing-api-config";
import { resolveIndexableUrl } from "@/features/seo/resolve-indexable-url";
import {
  getServiceAccountAccessToken,
  resolveServiceAccountClientEmail,
} from "./service-account";

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
