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

test("formats 429 without reconnect or enable-API hint", () => {
  const message = formatGoogleApiError(
    429,
    JSON.stringify({
      error: {
        message:
          "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute' of service 'mybusinessaccountmanagement.googleapis.com'",
      },
    }),
    {
      apiLabel: "Business Profile Account Management API",
      extraHint:
        "Enable My Business Account Management and Business Information APIs, then reconnect Business Profile with the business.manage OAuth scope under Admin → SEO → Google.",
    },
  );

  assert.match(message, /temporarily rate-limited/i);
  assert.match(message, /do not reconnect/i);
  assert.doesNotMatch(message, /Enable My Business Account Management/i);
  assert.doesNotMatch(message, /reconnect Business Profile/i);
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
    { apiLabel: "Google Indexing API", extraHint: "Enable My Business Account Management API and reconnect." },
  );

  assert.match(message, /not enabled/i);
  assert.ok(message.includes(enableUrl));
  assert.match(message, /Enable My Business Account Management API and reconnect/);
});
