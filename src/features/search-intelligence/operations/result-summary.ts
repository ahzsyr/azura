import type { ExecutionRecord } from "./types";
import { GOOGLE_INDEXING_CONFIGURE_HREF } from "@/features/seo/integrations/indexing-api-config";

export function operationResultHref(operationId: string): string {
  return `/admin/seo/search-operations/operations/${operationId}`;
}

export function configureHrefForRecord(record: Pick<ExecutionRecord, "definitionId" | "error" | "result">): string | undefined {
  const result = record.result ?? null;
  if (result && typeof result.configureHref === "string" && result.configureHref.trim()) {
    return result.configureHref;
  }

  const error = typeof record.error === "string" ? record.error : "";
  if (
    record.definitionId === "google.request_indexing" ||
    error.includes("Service account JSON") ||
    error.includes("Google Indexing API") ||
    error.includes("Google service account JSON not configured") ||
    error.includes("Indexing API is not enabled")
  ) {
    return GOOGLE_INDEXING_CONFIGURE_HREF;
  }
  if (
    record.definitionId === "google.sync_business_profile" ||
    error.includes("business.manage scope") ||
    error.includes("Business Profile Account Management API") ||
    error.includes("Business Profile accounts failed") ||
    error.includes("Business Profile OAuth token")
  ) {
    return "/admin/seo/google?tab=business-profile";
  }
  return undefined;
}

export function summarizeOperationResult(record: ExecutionRecord): string {
  const result = record.result ?? null;
  if (record.status === "failed") {
    return record.error ? `Failed — ${record.error}` : "Failed";
  }
  if (record.status === "waiting_approval") return "Waiting for approval";
  if (record.status === "queued") return "Queued";
  if (record.status === "running") return "Running…";
  if (record.status === "rejected") return "Rejected";
  if (record.status === "rolled_back") return "Rolled back";

  if (!result) {
    return record.status === "completed" ? "Completed" : `Status: ${record.status}`;
  }

  if (result.simulated === true) {
    const base = summarizeKnownResult(result) ?? "Completed (simulated)";
    return base.includes("simulated") ? base : `${base} (simulated)`;
  }

  return summarizeKnownResult(result) ?? "Completed";
}

function summarizeKnownResult(result: Record<string, unknown>): string | null {
  if (typeof result.lcpMs === "number" || typeof result.performanceScore === "number") {
    const parts: string[] = ["PageSpeed"];
    if (typeof result.performanceScore === "number") {
      parts.push(`Perf ${Math.round(result.performanceScore)}`);
    }
    if (typeof result.lcpMs === "number") {
      parts.push(`LCP ${(result.lcpMs / 1000).toFixed(1)}s`);
    }
    return parts.join(" — ");
  }

  if (typeof result.urlCount === "number" || result.rebuilt === true) {
    const count = typeof result.urlCount === "number" ? result.urlCount : null;
    const added = typeof result.addedCount === "number" ? result.addedCount : null;
    const removed = typeof result.removedCount === "number" ? result.removedCount : null;
    if (count != null && added != null && removed != null) {
      return `Sitemap — ${count} URLs (+${added}/-${removed})`;
    }
    if (count != null) return `Sitemap — ${count} URLs`;
    return "Sitemap rebuilt";
  }

  if (typeof result.state === "string" && typeof result.url === "string") {
    return `Indexing — ${result.state}`;
  }

  if (typeof result.indexed === "boolean") {
    if (result.redirectEntryPoint === true && !result.indexed) {
      return "Inspect — redirect entry (check canonical URL)";
    }
    return result.indexed ? "Inspect — indexed" : "Inspect — not indexed";
  }

  if (typeof result.urls === "object" && Array.isArray(result.urls)) {
    const indexNow = result.indexNow as
      | { submitted?: number; ok?: boolean; message?: string; host?: string }
      | undefined;
    const repair = result.repair as { mainPagesIndexableFixed?: number } | undefined;
    const parts = [`Priority pages — ${result.urls.length} URLs`];
    if (indexNow) {
      if (indexNow.ok) {
        parts.push(`IndexNow ok${indexNow.host ? ` (${indexNow.host})` : ""}`);
      } else {
        const detail = typeof indexNow.message === "string" ? indexNow.message.replace(/\s+/g, " ").slice(0, 120) : "";
        parts.push(detail ? `IndexNow failed — ${detail}` : "IndexNow failed");
      }
    }
    if (repair?.mainPagesIndexableFixed) {
      parts.push(`${repair.mainPagesIndexableFixed} robots fixed`);
    }
    return parts.join(" · ");
  }

  if (result.ok === true && result.synced != null) {
    return "Business Profile synced";
  }

  if (typeof result.message === "string" && result.message.trim()) {
    return String(result.message);
  }

  if (typeof result.nodes === "number") {
    return `Schema — ${result.nodes} nodes`;
  }

  if (typeof result.applied === "number") {
    return `Applied ${result.applied}`;
  }

  if (typeof result.draftId === "string") {
    return `Draft ${result.draftId}`;
  }

  return null;
}

export function formatEnqueueOutcome(record: ExecutionRecord): {
  id: string;
  status: ExecutionRecord["status"];
  result: Record<string, unknown> | null;
  resultHref: string;
  configureHref?: string;
  summary: string;
  ok: boolean;
  simulated: boolean;
} {
  const result = record.result ?? null;
  const simulated = Boolean(result?.simulated);
  const ok = record.status !== "failed" && record.status !== "rejected";
  return {
    id: record.id,
    status: record.status,
    result,
    resultHref: operationResultHref(record.id),
    configureHref: configureHrefForRecord(record),
    summary: summarizeOperationResult(record),
    ok,
    simulated,
  };
}
