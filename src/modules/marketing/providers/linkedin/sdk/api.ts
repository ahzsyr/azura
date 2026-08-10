export type LinkedInTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
};

export type LinkedInOrganization = {
  id: number | string;
  localizedName?: string;
};

export async function exchangeLinkedInCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<LinkedInTokenResponse> {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });
  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed: ${await response.text()}`);
  }
  return (await response.json()) as LinkedInTokenResponse;
}

export async function listLinkedInOrganizations(accessToken: string): Promise<LinkedInOrganization[]> {
  const response = await fetch(
    "https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`LinkedIn organizations lookup failed: ${await response.text()}`);
  }
  const body = (await response.json()) as {
    elements?: Array<{ organizationalTarget?: string }>;
  };
  return (body.elements ?? []).map((el, index) => ({
    id: el.organizationalTarget ?? `org-${index}`,
    localizedName: el.organizationalTarget ?? `Organization ${index + 1}`,
  }));
}

export async function publishLinkedInOrganizationPost(params: {
  organizationUrn: string;
  accessToken: string;
  text: string;
}) {
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.accessToken}`,
      "content-type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: params.organizationUrn,
      commentary: params.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    return { ok: false as const, message: text.slice(0, 500) };
  }
  return {
    ok: true as const,
    id: response.headers.get("x-restli-id") ?? undefined,
    message: "Published",
  };
}
