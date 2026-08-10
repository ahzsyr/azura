import "server-only";

import { getServiceAccountAccessToken } from "./service-account";

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
  const token = await getServiceAccountAccessToken([
    "https://www.googleapis.com/auth/indexing",
  ]);

  const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ url, type }),
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
    throw new Error(
      `Indexing API failed (${response.status}): ${text.slice(0, 300) || response.statusText}`,
    );
  }

  return {
    url,
    state: "submitted",
    live: true,
    notificationType: type,
    response: parsed,
    configureHref: "/admin/seo/google?tab=indexing_api",
  };
}
