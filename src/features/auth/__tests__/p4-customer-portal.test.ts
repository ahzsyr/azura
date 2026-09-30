import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActivityFromRequests,
  isLeadQuoteTemplate,
  mapFormStatusForCustomer,
  mapInquiryStatusForCustomer,
  mergeRequestItems,
  ownsFormSubmission,
  sanitizeQuotePayload,
} from "@/features/account/account-requests.helpers";
import { requiresMfaAtLogin } from "@/features/auth/mfa-policy";
import { isCustomerEmailUnverified } from "@/features/auth/account-status";
import { resolvePostLoginRedirect } from "@/features/auth/portal";

describe("P4 request helpers", () => {
  it("merges and sorts requests by createdAt desc", () => {
    const merged = mergeRequestItems([
      {
        id: "a",
        kind: "inquiry",
        label: "A",
        status: "Received",
        summary: "",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "b",
        kind: "quote",
        label: "B",
        status: "Received",
        summary: "",
        createdAt: "2024-06-01T00:00:00.000Z",
        updatedAt: "2024-06-01T00:00:00.000Z",
      },
    ]);
    assert.equal(merged[0]?.id, "b");
    assert.equal(merged[1]?.id, "a");
  });

  it("owns submission by customerId or legacy email match", () => {
    assert.equal(
      ownsFormSubmission({
        customerId: "u1",
        userId: "u1",
        userEmail: "a@example.com",
        payload: {},
      }),
      true,
    );
    assert.equal(
      ownsFormSubmission({
        customerId: "other",
        userId: "u1",
        userEmail: "a@example.com",
        payload: { email: "a@example.com" },
      }),
      false,
    );
    assert.equal(
      ownsFormSubmission({
        customerId: null,
        userId: "u1",
        userEmail: "a@example.com",
        payload: { email: "a@example.com" },
      }),
      true,
    );
  });

  it("sanitizes quote payload without admin fields", () => {
    const clean = sanitizeQuotePayload({
      email: "a@example.com",
      details: "Need a quote",
      score: 99,
      assigneeId: "admin-1",
      _internal: "x",
    });
    assert.equal(clean.email, "a@example.com");
    assert.equal(clean.details, "Need a quote");
    assert.equal("score" in clean, false);
    assert.equal("assigneeId" in clean, false);
    assert.equal("_internal" in clean, false);
  });

  it("recognizes LEAD/quote templates", () => {
    assert.equal(isLeadQuoteTemplate({ category: "LEAD", slug: "x" }), true);
    assert.equal(isLeadQuoteTemplate({ category: "GENERAL", slug: "quote-request" }), true);
    assert.equal(isLeadQuoteTemplate({ category: "GENERAL", slug: "newsletter" }), false);
  });

  it("maps statuses for customers", () => {
    assert.equal(mapInquiryStatusForCustomer("NEW"), "Received");
    assert.equal(mapFormStatusForCustomer("REVIEWED"), "In review");
  });

  it("builds activity from request updates", () => {
    const activity = buildActivityFromRequests(
      [
        {
          id: "1",
          kind: "inquiry",
          label: "CONTENT",
          status: "Contacted",
          updatedAt: "2024-02-01T00:00:00.000Z",
        },
        {
          id: "2",
          kind: "quote",
          label: "Quote",
          status: "Received",
          updatedAt: "2024-03-01T00:00:00.000Z",
        },
      ],
      10,
    );
    assert.equal(activity[0]?.id, "2");
  });
});

describe("P4 booking attach rule (documented)", () => {
  it("only attaches userId for customer sessions", () => {
    const resolveUserId = (role: string | undefined, id: string | undefined) =>
      role === "CUSTOMER" && id ? id : null;
    assert.equal(resolveUserId("CUSTOMER", "c1"), "c1");
    assert.equal(resolveUserId("ADMIN", "a1"), null);
    assert.equal(resolveUserId(undefined, "c1"), null);
  });
});

describe("P4 auth regressions", () => {
  it("CUSTOMER + totpEnabled still no MFA challenge (P1)", () => {
    assert.equal(requiresMfaAtLogin("CUSTOMER", true), false);
  });

  it("unverified CUSTOMER still blocked (P2)", () => {
    assert.equal(isCustomerEmailUnverified("CUSTOMER", null), true);
  });

  it("customer destination unchanged (P0)", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/en/account/requests",
      }),
      "/en/account/requests",
    );
  });
});
