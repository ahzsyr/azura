export type MetaGraphAccount = {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
};

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export async function metaGraphGet<T>(
  path: string,
  accessToken: string,
  query: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/v21.0${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Meta Graph API error ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function exchangeMetaCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<MetaTokenResponse> {
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("client_secret", params.clientSecret);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Meta token exchange failed: ${await response.text()}`);
  }
  return (await response.json()) as MetaTokenResponse;
}

export async function listMetaPages(accessToken: string): Promise<MetaGraphAccount[]> {
  const body = await metaGraphGet<{ data?: MetaGraphAccount[] }>("/me/accounts", accessToken, {
    fields: "id,name,access_token,category",
  });
  return body.data ?? [];
}

export async function publishMetaPagePost(params: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  link?: string;
}) {
  const url = new URL(`https://graph.facebook.com/v21.0/${params.pageId}/feed`);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      link: params.link,
      access_token: params.pageAccessToken,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    return { ok: false as const, message: text.slice(0, 500) };
  }
  const json = JSON.parse(text) as { id?: string };
  return { ok: true as const, id: json.id, message: "Published" };
}

export async function listMetaAdAccounts(accessToken: string) {
  const body = await metaGraphGet<{
    data?: Array<{ account_id: string; id: string; name: string; currency?: string; account_status?: number }>;
  }>("/me/adaccounts", accessToken, {
    fields: "account_id,id,name,currency,account_status",
  });
  return body.data ?? [];
}

export async function listMetaAdsCampaigns(accessToken: string, adAccountId: string) {
  const accountPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const body = await metaGraphGet<{
    data?: Array<{ id: string; name: string; status?: string; objective?: string }>;
  }>(`/${accountPath}/campaigns`, accessToken, {
    fields: "id,name,status,objective",
    limit: "100",
  });
  return body.data ?? [];
}

export async function listMetaAdSets(accessToken: string, campaignId: string) {
  const body = await metaGraphGet<{
    data?: Array<{ id: string; name: string; status?: string; campaign_id?: string }>;
  }>(`/${campaignId}/adsets`, accessToken, {
    fields: "id,name,status,campaign_id",
    limit: "100",
  });
  return body.data ?? [];
}

export async function listMetaAds(accessToken: string, adSetId: string) {
  const body = await metaGraphGet<{
    data?: Array<{ id: string; name: string; status?: string; adset_id?: string; creative?: { id?: string } }>;
  }>(`/${adSetId}/ads`, accessToken, {
    fields: "id,name,status,adset_id,creative{id}",
    limit: "100",
  });
  return body.data ?? [];
}

export async function getMetaAdInsights(
  accessToken: string,
  objectId: string,
  period: { from: string; to: string },
) {
  const body = await metaGraphGet<{
    data?: Array<{
      impressions?: string;
      clicks?: string;
      spend?: string;
      reach?: string;
      actions?: Array<{ action_type: string; value: string }>;
    }>;
  }>(`/${objectId}/insights`, accessToken, {
    fields: "impressions,clicks,spend,reach,actions",
    time_range: JSON.stringify({ since: period.from.slice(0, 10), until: period.to.slice(0, 10) }),
  });
  return body.data?.[0] ?? null;
}
