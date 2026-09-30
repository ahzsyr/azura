export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  projectId?: string;
  redirectUris?: string[];
  javascriptOrigins?: string[];
};

type CredentialRecord = Record<string, unknown>;

function readString(record: CredentialRecord, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readStringArray(record: CredentialRecord, key: string): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function credentialsFromRecord(record: CredentialRecord): GoogleOAuthCredentials | null {
  const clientId = readString(record, "client_id");
  const clientSecret = readString(record, "client_secret");
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    projectId: readString(record, "project_id"),
    redirectUris: readStringArray(record, "redirect_uris"),
    javascriptOrigins: readStringArray(record, "javascript_origins"),
  };
}

function resolveCredentialRecord(raw: unknown): CredentialRecord | null {
  if (!raw || typeof raw !== "object") return null;

  const root = raw as CredentialRecord;
  const nested = root.web ?? root.installed;
  if (nested && typeof nested === "object") {
    return nested as CredentialRecord;
  }

  if (readString(root, "client_id") && readString(root, "client_secret")) {
    return root;
  }

  return null;
}

export function parseGoogleOAuthCredentialsJson(raw: unknown): GoogleOAuthCredentials {
  const record = resolveCredentialRecord(raw);
  if (!record) {
    throw new Error(
      "Unrecognized OAuth client JSON. Expected a Google Cloud download with a web.client_id and web.client_secret.",
    );
  }

  const credentials = credentialsFromRecord(record);
  if (!credentials) {
    throw new Error("OAuth client JSON is missing client_id or client_secret.");
  }

  return credentials;
}

export function normalizeOAuthRedirectUri(uri: string): string {
  try {
    const url = new URL(uri.trim());
    url.hash = "";
    url.search = "";
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.origin}${pathname === "/" ? "" : pathname}`;
  } catch {
    return uri.trim().replace(/\/+$/, "");
  }
}

export function oauthRedirectUriMatches(registered: string, expected: string): boolean {
  return normalizeOAuthRedirectUri(registered) === normalizeOAuthRedirectUri(expected);
}

export function findMissingOAuthRedirectUri(
  redirectUris: string[] | undefined,
  expected: string,
): boolean {
  if (!redirectUris?.length) return false;
  return !redirectUris.some((uri) => oauthRedirectUriMatches(uri, expected));
}
