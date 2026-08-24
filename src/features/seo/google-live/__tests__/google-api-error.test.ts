import assert from "node:assert/strict";
import test from "node:test";
import { formatGoogleApiError } from "../google-api-error";

test("formats ownership 403 with service account email", () => {
  const message = formatGoogleApiError(
    403,
    JSON.stringify({
      error: {
        message: "Permission denied. Failed to verify the URL ownership.",
      },
    }),
    {
      apiLabel: "Google Indexing API",
      serviceAccountEmail: "indexing@demo-project.iam.gserviceaccount.com",
    },
  );

  assert.match(message, /could not verify ownership/i);
  assert.match(message, /indexing@demo-project\.iam\.gserviceaccount\.com/);
  assert.match(message, /Owner/);
});

test("formats API-not-enabled 403 with enable link", () => {
  const enableUrl =
    "https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=123456";
  const message = formatGoogleApiError(
    403,
    JSON.stringify({
      error: {
        message: `Indexing API has not been used in project 123456 before or it is disabled. Enable it by visiting ${enableUrl}`,
      },
    }),
    { apiLabel: "Google Indexing API" },
  );

  assert.match(message, /not enabled/i);
  assert.ok(message.includes(enableUrl));
});
