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
