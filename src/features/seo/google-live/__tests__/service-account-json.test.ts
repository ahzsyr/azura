import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeServiceAccountJsonFromTransport,
  decodeServiceAccountTransportPayload,
  encodeServiceAccountJsonForTransport,
  formDataHasGoogleOAuthFields,
  isValidBase64,
  normalizeServiceAccountJsonInput,
  parseServiceAccountJson,
  serializeServiceAccountJson,
  SERVICE_ACCOUNT_TRANSPORT_CORRUPTED,
  stripBomAndTrim,
  validateServiceAccountJson,
} from "../service-account-json";

const PEM_BODY =
  "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB" +
  "wI/fE/Yg2RcY4Vj1C2x7Z3K9xJ6mN8pQ0rS1tU2vW3xY4zA5bC6dE7fG8hI9jK0lM1nO2pQ3rS4tU5vW6xY7zA8bC9dE0fG1hI2jK3lM4nO5pQ6rS7tU8vW9xY0zA1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8jK9lM0nO1pQ2rS3tU4vW5xY6zA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA0bC1dE2fG3hI4jK5lM6nO7pQ8rS9tU0vW1xY2zA3bC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6pQ7rS8tU9vW0xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4zA5bC6dE7fG8hI9jK0lM1nO2pQ3rS4tU5vW6xY7zA8bC9dE0fG1hI2jK3lM4nO5pQ6rS7tU8vW9xY0zA1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8jK9lM0nO1pQ2rS3tU4vW5xY6zA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA0bC1dE2fG3hI4jK5lM6nO7pQ8rS9tU0vW1xY2zA3bC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6pQ7rS8tU9vW0xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0";

const SAMPLE_KEY = JSON.stringify({
  type: "service_account",
  project_id: "demo-project",
  private_key_id: "abc123",
  private_key: `-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----\n`,
  client_email: "indexing@demo-project.iam.gserviceaccount.com",
  client_id: "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
});

test("accepts valid service account JSON", () => {
  const result = validateServiceAccountJson(SAMPLE_KEY);
  assert.equal(result.ok, true);
});

test("strips markdown fences before validation", () => {
  const wrapped = "```json\n" + SAMPLE_KEY + "\n```";
  const result = validateServiceAccountJson(wrapped);
  assert.equal(result.ok, true);
});

test("rejects OAuth client secret JSON with helpful message", () => {
  const oauthClient = JSON.stringify({
    web: {
      client_id: "123.apps.googleusercontent.com",
      client_secret: "secret",
    },
  });
  const result = validateServiceAccountJson(oauthClient);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /OAuth client secret/i);
  }
});

test("normalize removes UTF-8 BOM", () => {
  const withBom = "\uFEFF" + SAMPLE_KEY;
  assert.equal(normalizeServiceAccountJsonInput(withBom), SAMPLE_KEY);
});

test("stripBomAndTrim preserves escaped newlines in canonical JSON", () => {
  const withBom = "\uFEFF  " + SAMPLE_KEY + "  ";
  const stripped = stripBomAndTrim(withBom);
  assert.equal(stripped, SAMPLE_KEY);
  assert.equal(stripped.includes("\\n"), true);
});

test("extracts fields from multiline private_key JSON", () => {
  const multiline = `{
  "type": "service_account",
  "private_key": "-----BEGIN PRIVATE KEY-----
line1
line2
-----END PRIVATE KEY-----
",
  "client_email": "svc@project.iam.gserviceaccount.com"
}`;
  const result = validateServiceAccountJson(multiline);
  assert.equal(result.ok, true);
});

test("serialize produces canonical JSON", () => {
  const canonical = serializeServiceAccountJson(SAMPLE_KEY);
  assert.match(canonical, /"client_email":"indexing@demo-project.iam.gserviceaccount.com"/);
  assert.match(canonical, /\\n-----END PRIVATE KEY-----\\n/);
});

test("pretty-printed Google JSON passes direct parse and validation", () => {
  const pretty = JSON.stringify(JSON.parse(SAMPLE_KEY), null, 2);
  const parsed = parseServiceAccountJson(pretty);
  assert.equal(parsed.client_email, "indexing@demo-project.iam.gserviceaccount.com");
  assert.equal(validateServiceAccountJson(pretty).ok, true);
});

test("base64 transport round-trips service account JSON", () => {
  const encoded = encodeServiceAccountJsonForTransport(SAMPLE_KEY);
  const decoded = decodeServiceAccountJsonFromTransport(encoded);
  assert.equal(decoded, SAMPLE_KEY);
  assert.equal(validateServiceAccountJson(decoded).ok, true);
});

test("canonical serialized JSON round-trips through transport", () => {
  const canonical = serializeServiceAccountJson(SAMPLE_KEY);
  const encoded = encodeServiceAccountJsonForTransport(canonical);
  const decoded = decodeServiceAccountTransportPayload(encoded);
  assert.equal(decoded, canonical);
  assert.equal(validateServiceAccountJson(decoded).ok, true);
  assert.equal(serializeServiceAccountJson(decoded), canonical);
});

test("realistic PEM key passes full production path", () => {
  const canonical = serializeServiceAccountJson(SAMPLE_KEY);
  const encoded = encodeServiceAccountJsonForTransport(canonical);
  const decoded = decodeServiceAccountTransportPayload(encoded);
  const parsed = parseServiceAccountJson(decoded);
  const validated = validateServiceAccountJson(decoded);
  assert.equal(validated.ok, true);
  assert.equal(parsed.client_email, "indexing@demo-project.iam.gserviceaccount.com");
  assert.match(parsed.private_key ?? "", /-----BEGIN PRIVATE KEY-----/);
});

test("transport integrity implies direct parser success on same decoded string", () => {
  const encoded = encodeServiceAccountJsonForTransport(SAMPLE_KEY);
  const decoded = decodeServiceAccountTransportPayload(encoded);
  const parsed = parseServiceAccountJson(decoded);
  assert.equal(parsed.client_email, "indexing@demo-project.iam.gserviceaccount.com");
  assert.equal(validateServiceAccountJson(decoded).ok, true);
});

test("repeated canonical parse returns same serialized result", () => {
  const canonical = serializeServiceAccountJson(SAMPLE_KEY);
  const first = serializeServiceAccountJson(canonical);
  const second = serializeServiceAccountJson(first);
  assert.equal(first, second);
});

test("isValidBase64 rejects truncated base64", () => {
  const encoded = encodeServiceAccountJsonForTransport(SAMPLE_KEY);
  const truncated = encoded.slice(0, -1);
  assert.equal(isValidBase64(truncated), false);
  assert.throws(
    () => decodeServiceAccountTransportPayload(truncated),
    (error: Error) => error.message === SERVICE_ACCOUNT_TRANSPORT_CORRUPTED,
  );
});

test("isValidBase64 rejects invalid base64 characters", () => {
  assert.equal(isValidBase64("abc@def==="), false);
  assert.throws(
    () => decodeServiceAccountTransportPayload("abc@def==="),
    (error: Error) => error.message === SERVICE_ACCOUNT_TRANSPORT_CORRUPTED,
  );
});

test("valid base64 containing non-JSON produces transport error", () => {
  const encoded = encodeServiceAccountJsonForTransport("not json at all");
  assert.throws(
    () => decodeServiceAccountTransportPayload(encoded),
    (error: Error) => error.message === SERVICE_ACCOUNT_TRANSPORT_CORRUPTED,
  );
});

test("parser returns staged invalid-json error for non-JSON input", () => {
  const result = validateServiceAccountJson("not json at all");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /not valid JSON/i);
  }
});

test("parser returns staged repair error for malformed pasted key", () => {
  const malformed = `{
  "private_key": "-----BEGIN PRIVATE KEY-----
line1
line2
-----END PRIVATE KEY-----
",
  "client_email": svc@project.iam.gserviceaccount.com
}`;
  const result = validateServiceAccountJson(malformed);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /copy-pasting/i);
  }
});

test("missing client_email produces specific validation error", () => {
  const json = JSON.stringify({
    type: "service_account",
    private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
  });
  const result = validateServiceAccountJson(json);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /client_email/i);
  }
});

test("missing private_key produces specific validation error", () => {
  const json = JSON.stringify({
    type: "service_account",
    client_email: "svc@project.iam.gserviceaccount.com",
  });
  const result = validateServiceAccountJson(json);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /private_key/i);
  }
});

test("wrong type produces specific validation error", () => {
  const json = JSON.stringify({
    type: "user_account",
    client_email: "svc@project.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
  });
  const result = validateServiceAccountJson(json);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /service_account/i);
  }
});

test("malformed private_key produces specific validation error", () => {
  const json = JSON.stringify({
    type: "service_account",
    client_email: "svc@project.iam.gserviceaccount.com",
    private_key: "not-a-pem-key",
  });
  const result = validateServiceAccountJson(json);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /private_key is malformed/i);
  }
});

test("formDataHasGoogleOAuthFields excludes google_indexing keys", () => {
  const indexingOnly = ["google_indexing.enabled", "googleIndexingServiceAccountJsonB64"];
  assert.equal(formDataHasGoogleOAuthFields(indexingOnly), false);

  const oauthKeys = ["google.enabled", "google.clientId"];
  assert.equal(formDataHasGoogleOAuthFields(oauthKeys), true);

  assert.equal("google_indexing.enabled".startsWith("google."), false);
});

test("OAuth config is preserved when only google_indexing keys are submitted", () => {
  const existing = {
    google: {
      enabled: true,
      clientId: "oauth-client-id",
      clientSecret: "oauth-client-secret",
      bearerToken: "oauth-token",
    },
    google_indexing: {
      enabled: false,
    },
  };

  const formKeys = ["google_indexing.enabled", "googleIndexingServiceAccountJsonB64"];
  const hasGoogleFields = formDataHasGoogleOAuthFields(formKeys);
  assert.equal(hasGoogleFields, false);

  const incomingGoogle = hasGoogleFields
    ? { enabled: false, clientId: undefined, clientSecret: undefined }
    : existing.google;

  assert.equal(incomingGoogle.enabled, true);
  assert.equal(incomingGoogle.clientId, "oauth-client-id");
  assert.equal(incomingGoogle.clientSecret, "oauth-client-secret");
});
