import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";

type CspReportBody = {
  "csp-report"?: Record<string, unknown>;
  type?: string;
  age?: number;
  url?: string;
  body?: Record<string, unknown>;
};

function summarizeViolation(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as CspReportBody;

  // Legacy report-uri shape
  const legacy = body["csp-report"];
  if (legacy && typeof legacy === "object") {
    return {
      format: "csp-report",
      documentUri: legacy["document-uri"] ?? legacy.documentURI,
      violatedDirective: legacy["violated-directive"] ?? legacy.violatedDirective,
      effectiveDirective: legacy["effective-directive"] ?? legacy.effectiveDirective,
      blockedUri: legacy["blocked-uri"] ?? legacy.blockedURI,
      sourceFile: legacy["source-file"] ?? legacy.sourceFile,
      lineNumber: legacy["line-number"] ?? legacy.lineNumber,
      disposition: legacy.disposition,
    };
  }

  // Reporting API (report-to) shape
  if (body.type === "csp-violation" || body.body) {
    const detail = (body.body ?? {}) as Record<string, unknown>;
    return {
      format: "reporting-api",
      documentUri: detail.documentURL ?? detail.documentUri ?? body.url,
      violatedDirective: detail.violatedDirective ?? detail.effectiveDirective,
      effectiveDirective: detail.effectiveDirective,
      blockedUri: detail.blockedURL ?? detail.blockedUri,
      sourceFile: detail.sourceFile,
      lineNumber: detail.lineNumber,
      disposition: detail.disposition,
    };
  }

  return { format: "unknown", keys: Object.keys(body) };
}

/**
 * Accepts CSP Report-Only / Reporting-API payloads (intentionally public).
 * Structured logging supports inventory for CSP rollout milestones (see docs/deployment/csp-rollout.md).
 */
export const POST = defineApiRoute({
  access: "public",
  handler: async ({ request }) => {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      let payload: unknown = null;
      if (contentType.includes("application/json") || contentType.includes("csp-report")) {
        payload = await request.json().catch(() => null);
      } else {
        const text = await request.text().catch(() => "");
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch {
            payload = { rawLength: text.length };
          }
        }
      }

      const summary = summarizeViolation(payload);
      if (summary) {
        console.info("[csp-report]", JSON.stringify(summary));
      }
    } catch {
      // Never fail the reporter — browsers retry aggressively on errors.
    }

    return new NextResponse(null, { status: 204 });
  },
});
