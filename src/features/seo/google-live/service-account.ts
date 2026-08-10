import "server-only";

import { createSign } from "node:crypto";
import { seoRepository } from "@/repositories/seo.repository";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";

type ServiceAccountJson = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

function base64Url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function resolveServiceAccountJson(): Promise<string | null> {
  const platform = await getGooglePlatformState().catch(() => null);
  const fromPlatform = platform?.services?.indexing_api?.configuration?.serviceAccountJson;
  if (typeof fromPlatform === "string" && fromPlatform.trim()) return fromPlatform.trim();

  const integrations = await seoRepository.getIntegrationsConfig().catch(() => null);
  const fromLegacy = integrations?.google?.serviceAccountJson;
  if (typeof fromLegacy === "string" && fromLegacy.trim()) return fromLegacy.trim();
  return null;
}

export async function getServiceAccountAccessToken(scopes: string[]): Promise<string> {
  const raw = await resolveServiceAccountJson();
  if (!raw) {
    throw new Error(
      "Google service account JSON not configured. Add it under Admin → SEO → Google → Indexing API.",
    );
  }

  let parsed: ServiceAccountJson;
  try {
    parsed = JSON.parse(raw) as ServiceAccountJson;
  } catch {
    throw new Error("Service account JSON is invalid.");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON must include client_email and private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: parsed.client_email,
    scope: scopes.join(" "),
    aud: parsed.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64Url(signer.sign(parsed.private_key));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(parsed.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Service account token failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Service account token response missing access_token.");
  return body.access_token;
}
