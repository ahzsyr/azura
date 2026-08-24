export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeGoogleAdsCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }
  return (await response.json()) as GoogleTokenResponse;
}

/**
 * Google Ads API calls require a developer token + login customer id.
 * These are stored in MarketingProviderAppConfig.metadata.
 */
export async function googleAdsSearch(params: {
  accessToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
  query: string;
}) {
  const customerId = params.customerId.replace(/-/g, "");
  const response = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "developer-token": params.developerToken,
        ...(params.loginCustomerId
          ? { "login-customer-id": params.loginCustomerId.replace(/-/g, "") }
          : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: params.query }),
    },
  );
  if (!response.ok) {
    throw new Error(`Google Ads API error ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as Array<{ results?: unknown[] }>;
  return json.flatMap((chunk) => chunk.results ?? []);
}
