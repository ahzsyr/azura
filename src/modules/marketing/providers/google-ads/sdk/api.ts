export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

/** Current Google Ads API major version (v17 is sunset and returns HTML 404). */
export const GOOGLE_ADS_API_VERSION = "v25";

const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

/** Strip hyphens from a Google Ads customer / MCC id. */
export function normalizeGoogleAdsCustomerId(id: string | null | undefined): string {
  return String(id ?? "").replace(/-/g, "").trim();
}

/**
 * Parse a Google Ads customer / MCC id: digits only after hyphen strip, length 6–12
 * (typically 10). Rejects emails and other non-numeric values (e.g. social@brtme.com).
 */
export function parseGoogleAdsCustomerId(id: string | null | undefined): string | null {
  const normalized = normalizeGoogleAdsCustomerId(id);
  if (!normalized) return null;
  if (!/^\d{6,12}$/.test(normalized)) return null;
  return normalized;
}

/**
 * Build Ads API request identity.
 * customerId = selected Ads customer; loginCustomerId = MCC (manager).
 */
export function buildGoogleAdsRequestContext(params: {
  customerId: string;
  loginCustomerId?: string | null;
}) {
  const customerId = normalizeGoogleAdsCustomerId(params.customerId);
  const loginCustomerId =
    normalizeGoogleAdsCustomerId(params.loginCustomerId) || customerId;
  return { customerId, loginCustomerId };
}

function formatGoogleAdsHttpError(status: number, body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("<!") || trimmed.toLowerCase().includes("<html")) {
    if (status === 404) {
      return `Google Ads API ${status}: endpoint not found for ${GOOGLE_ADS_API_VERSION}. The API version may be sunset, or the customer ID is inaccessible.`;
    }
    return `Google Ads API ${status}: non-JSON error page from Google (check API version, developer token, and customer ID).`;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string; status?: string };
      message?: string;
    };
    const msg = parsed.error?.message || parsed.message;
    if (msg) return `Google Ads API ${status}: ${msg}`;
  } catch {
    // fall through
  }
  return `Google Ads API error ${status}: ${trimmed.slice(0, 400)}`;
}

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

export async function refreshGoogleAdsAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${await response.text()}`);
  }
  return (await response.json()) as GoogleTokenResponse;
}

/**
 * Google Ads API calls require a developer token + login customer id.
 * customerId must be the selected Ads customer (not the MCC).
 * loginCustomerId is the MCC / manager account.
 */
export async function googleAdsSearch(params: {
  accessToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
  query: string;
}) {
  const { customerId, loginCustomerId } = buildGoogleAdsRequestContext({
    customerId: params.customerId,
    loginCustomerId: params.loginCustomerId,
  });
  if (!customerId) {
    throw new Error("Google Ads customerId is required");
  }
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "developer-token": params.developerToken,
        "login-customer-id": loginCustomerId,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: params.query }),
    },
  );
  if (!response.ok) {
    throw new Error(formatGoogleAdsHttpError(response.status, await response.text()));
  }
  const json = (await response.json()) as {
    results?: unknown[];
  };
  return json.results ?? [];
}

/** Lightweight health probe against the selected customer. */
export async function googleAdsProbeCustomer(params: {
  accessToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
}): Promise<{ ok: boolean; customerId?: string; message?: string }> {
  try {
    const results = await googleAdsSearch({
      ...params,
      query: `SELECT customer.id FROM customer LIMIT 1`,
    });
    const row = results[0] as { customer?: { id?: string } } | undefined;
    const id = row?.customer?.id ? String(row.customer.id) : undefined;
    return { ok: true, customerId: id };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function uploadGoogleAdsOfflineConversion(params: {
  accessToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
  conversionActionResourceName: string;
  gclid: string;
  conversionDateTime: string;
  conversionValue?: number;
  currencyCode?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { customerId, loginCustomerId } = buildGoogleAdsRequestContext({
    customerId: params.customerId,
    loginCustomerId: params.loginCustomerId,
  });
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${customerId}:uploadClickConversions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "developer-token": params.developerToken,
        "login-customer-id": loginCustomerId,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        conversions: [
          {
            conversionAction: params.conversionActionResourceName,
            gclid: params.gclid,
            conversionDateTime: params.conversionDateTime,
            ...(params.conversionValue != null
              ? {
                  conversionValue: params.conversionValue,
                  currencyCode: params.currencyCode ?? "USD",
                }
              : {}),
          },
        ],
        partialFailure: true,
      }),
    },
  );
  if (!response.ok) {
    return {
      ok: false,
      message: formatGoogleAdsHttpError(response.status, await response.text()),
    };
  }
  return { ok: true };
}
