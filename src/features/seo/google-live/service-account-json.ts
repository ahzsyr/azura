export type ServiceAccountJson = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  client_secret?: string;
  token_uri?: string;
  auth_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
};

export const SERVICE_ACCOUNT_TRANSPORT_CORRUPTED =
  "Indexing API key transport is corrupted. Re-import the key file and save again.";
export const SERVICE_ACCOUNT_TRANSPORT_EMPTY =
  "Indexing API key transport is empty. Re-import the key file and save again.";
const SERVICE_ACCOUNT_NOT_JSON =
  "Service account JSON is not valid JSON. Import the downloaded .json file.";
const SERVICE_ACCOUNT_REPAIR_FAILED =
  "Could not parse service account JSON. Import the file instead of copy-pasting.";

export function encodeServiceAccountJsonForTransport(json: string): string {
  if (!json.trim()) return "";
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeServiceAccountJsonFromTransport(encoded: string): string {
  const trimmed = encoded.trim();
  if (!trimmed) return "";
  if (typeof Buffer !== "undefined") {
    return Buffer.from(trimmed, "base64").toString("utf-8");
  }
  const binary = atob(trimmed);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function stripBomAndTrim(raw: string): string {
  let value = raw.trim();
  if (value.length > 0 && value.charCodeAt(0) === 0xfeff) {
    value = value.slice(1).trim();
  }
  return value;
}

/** Base64 transport-format check only — not proof the payload is intact. */
export function isValidBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
  return true;
}

export function decodeServiceAccountTransportPayload(encoded: string): string {
  if (!isValidBase64(encoded)) {
    throw new Error(SERVICE_ACCOUNT_TRANSPORT_CORRUPTED);
  }

  const decoded = decodeServiceAccountJsonFromTransport(encoded);
  const trimmed = stripBomAndTrim(decoded);
  if (!trimmed) {
    throw new Error(SERVICE_ACCOUNT_TRANSPORT_EMPTY);
  }

  try {
    const parsed = tryDirectJsonParse(trimmed);
    if (!parsed) {
      throw new Error(SERVICE_ACCOUNT_TRANSPORT_CORRUPTED);
    }
  } catch (error) {
    if (error instanceof Error && error.message === SERVICE_ACCOUNT_TRANSPORT_CORRUPTED) {
      throw error;
    }
    throw new Error(SERVICE_ACCOUNT_TRANSPORT_CORRUPTED);
  }

  return trimmed;
}

/** Path B only: strip markdown fences and other paste wrappers after direct parse fails. */
export function normalizeServiceAccountJsonInput(raw: string): string {
  let value = stripBomAndTrim(raw);
  const fenceMatch = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    value = fenceMatch[1].trim();
  }
  return value;
}

function unescapeJsonString(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function repairMultilinePrivateKeyJson(raw: string): string {
  const pattern =
    /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----(?:\\n|"[\s,])/;

  return raw.replace(pattern, (_match, body: string) => {
    const normalizedBody = body.replace(/\r/g, "").replace(/\n/g, "\\n");
    return `"private_key": "-----BEGIN PRIVATE KEY-----${normalizedBody}\\n-----END PRIVATE KEY-----\\n"`;
  });
}

function extractServiceAccountFields(raw: string): ServiceAccountJson | null {
  const normalized = normalizeServiceAccountJsonInput(raw);
  const clientEmailMatch = normalized.match(/"client_email"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const typeMatch = normalized.match(/"type"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const projectIdMatch = normalized.match(/"project_id"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const privateKeyIdMatch = normalized.match(/"private_key_id"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const clientIdMatch = normalized.match(/"client_id"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const tokenUriMatch = normalized.match(/"token_uri"\s*:\s*"((?:\\.|[^"\\])*)"/);

  let privateKey: string | undefined;
  const escapedKeyMatch = normalized.match(/"private_key"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (escapedKeyMatch) {
    privateKey = unescapeJsonString(escapedKeyMatch[1]);
  } else {
    const multilineMatch = normalized.match(
      /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----(?:\\n)?"/,
    );
    if (multilineMatch) {
      const body = multilineMatch[1].replace(/\r/g, "").replace(/\n/g, "");
      privateKey = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
    }
  }

  if (!clientEmailMatch?.[1] || !privateKey?.trim()) {
    return null;
  }

  return {
    type: typeMatch?.[1] ? unescapeJsonString(typeMatch[1]) : "service_account",
    project_id: projectIdMatch?.[1] ? unescapeJsonString(projectIdMatch[1]) : undefined,
    private_key_id: privateKeyIdMatch?.[1] ? unescapeJsonString(privateKeyIdMatch[1]) : undefined,
    private_key: privateKey,
    client_email: unescapeJsonString(clientEmailMatch[1]),
    client_id: clientIdMatch?.[1] ? unescapeJsonString(clientIdMatch[1]) : undefined,
    token_uri: tokenUriMatch?.[1] ? unescapeJsonString(tokenUriMatch[1]) : undefined,
  };
}

function parseJsonObject(raw: string): unknown {
  let parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") {
    parsed = JSON.parse(normalizeServiceAccountJsonInput(parsed));
  }
  return parsed;
}

function tryDirectJsonParse(input: string): ServiceAccountJson | null {
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ServiceAccountJson;
    }
  } catch {
    // fall through to repair/extraction logic
  }
  return null;
}

function objectFromParsed(parsed: unknown, raw: string): ServiceAccountJson {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (record.web || record.installed) {
      throw new Error(
        "This looks like an OAuth client secret file, not a service account key. In Google Cloud, open IAM → Service Accounts → Keys → Add key → JSON, then paste that file here.",
      );
    }

    const obj = parsed as ServiceAccountJson;
    const clientEmail = obj.client_email?.trim();
    const privateKey = obj.private_key?.trim();
    if (clientEmail && privateKey) {
      return obj;
    }

    if (clientEmail || privateKey || obj.type) {
      return obj;
    }
  }

  const extracted = extractServiceAccountFields(raw);
  if (extracted) {
    return extracted;
  }

  throw new Error(SERVICE_ACCOUNT_REPAIR_FAILED);
}

export function parseServiceAccountJson(raw: string): ServiceAccountJson {
  const trimmed = stripBomAndTrim(raw);
  if (!trimmed) {
    throw new Error("Service account JSON is empty.");
  }

  const direct = tryDirectJsonParse(trimmed);
  if (direct) {
    return direct;
  }

  const normalized = normalizeServiceAccountJsonInput(trimmed);

  try {
    return objectFromParsed(parseJsonObject(normalized), normalized);
  } catch (error) {
    if (error instanceof Error && /OAuth client secret/i.test(error.message)) {
      throw error;
    }

    try {
      const repaired = repairMultilinePrivateKeyJson(normalized);
      const repairedCanonical = tryDirectJsonParse(repaired);
      if (repairedCanonical) {
        return repairedCanonical;
      }
      return objectFromParsed(parseJsonObject(repaired), repaired);
    } catch (innerError) {
      if (innerError instanceof Error && /OAuth client secret/i.test(innerError.message)) {
        throw innerError;
      }
      const extracted = extractServiceAccountFields(normalized);
      if (extracted) return extracted;
      const looksLikeServiceAccountPaste =
        normalized !== trimmed ||
        /client_email|private_key|BEGIN PRIVATE KEY|END PRIVATE KEY/.test(normalized);
      throw new Error(
        looksLikeServiceAccountPaste ? SERVICE_ACCOUNT_REPAIR_FAILED : SERVICE_ACCOUNT_NOT_JSON,
      );
    }
  }
}

/** Canonical JSON string for storage (single-line private_key escapes preserved). */
export function serializeServiceAccountJson(raw: string): string {
  const parsed = parseServiceAccountJson(raw);
  return JSON.stringify(parsed);
}

function validateParsedServiceAccount(parsed: ServiceAccountJson): { ok: true } | { ok: false; message: string } {
  const clientEmail = parsed.client_email?.trim();
  const privateKey = parsed.private_key?.trim();

  if (!clientEmail && !privateKey) {
    const serialized = JSON.stringify(parsed);
    if (
      parsed.client_id ||
      parsed.client_secret ||
      /client_secret|googleusercontent\.com|"web"|"installed"/i.test(serialized)
    ) {
      return {
        ok: false,
        message:
          "This looks like an OAuth client secret file, not a service account key. In Google Cloud, open IAM → Service Accounts → Keys → Add key → JSON, then paste that file here.",
      };
    }
    return {
      ok: false,
      message:
        "Invalid service account JSON. Download the JSON key from Google Cloud (Service Accounts → Keys) and paste the full file contents.",
    };
  }

  if (parsed.type && parsed.type !== "service_account") {
    return {
      ok: false,
      message: 'Service account JSON must have type "service_account".',
    };
  }

  if (!clientEmail) {
    return {
      ok: false,
      message: 'Service account JSON is missing "client_email".',
    };
  }

  if (!privateKey) {
    return {
      ok: false,
      message: 'Service account JSON is missing "private_key".',
    };
  }

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    return {
      ok: false,
      message: "Service account private_key is malformed.",
    };
  }

  return { ok: true };
}

export function validateServiceAccountJson(raw: string): { ok: true } | { ok: false; message: string } {
  let parsed: ServiceAccountJson;
  try {
    parsed = parseServiceAccountJson(raw);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : SERVICE_ACCOUNT_NOT_JSON,
    };
  }

  return validateParsedServiceAccount(parsed);
}

export function diagnoseServiceAccountJsonFailure(raw: string): string {
  const result = validateServiceAccountJson(raw);
  return result.ok ? "Service account JSON is valid." : result.message;
}

export function formDataHasGoogleOAuthFields(keys: Iterable<string>): boolean {
  return Array.from(keys).some(
    (key) => key.startsWith("google.") && !key.startsWith("google_indexing."),
  );
}
