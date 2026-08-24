/**
 * Pure helpers for customer portal requests (safe for unit tests).
 */

export type AccountRequestKind = "inquiry" | "quote";

export type AccountRequestListItem = {
  id: string;
  kind: AccountRequestKind;
  label: string;
  status: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  linkedContent?: { id: string; slug: string | null; title?: string } | null;
};

const ADMIN_PAYLOAD_KEYS = new Set([
  "assigneeId",
  "score",
  "pipelineType",
  "tags",
  "companyId",
  "campaignId",
  "metadata",
]);

/** Customer-visible form statuses. */
export function mapFormStatusForCustomer(status: string): string {
  switch (status) {
    case "NEW":
      return "Received";
    case "REVIEWED":
      return "In review";
    case "ARCHIVED":
      return "Closed";
    default:
      return status;
  }
}

export function mapInquiryStatusForCustomer(status: string): string {
  switch (status) {
    case "NEW":
      return "Received";
    case "CONTACTED":
      return "Contacted";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

/** Strip admin-only fields from form payload for customer views. */
export function sanitizeQuotePayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (ADMIN_PAYLOAD_KEYS.has(key)) continue;
    if (key.startsWith("_")) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (value == null) {
      out[key] = value;
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

export function isLeadQuoteTemplate(input: {
  category?: string | null;
  slug?: string | null;
}): boolean {
  if (input.category === "LEAD" || input.category === "CONTACT") return true;
  const slug = (input.slug ?? "").toLowerCase();
  return slug.includes("quote") || slug.includes("contact") || slug.includes("lead");
}

export function extractPayloadEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const email = (payload as Record<string, unknown>).email;
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

export function ownsFormSubmission(input: {
  customerId: string | null | undefined;
  userId: string;
  userEmail: string;
  payload: unknown;
}): boolean {
  if (input.customerId && input.customerId === input.userId) return true;
  if (input.customerId) return false;
  const email = extractPayloadEmail(input.payload);
  return Boolean(email && email === input.userEmail.trim().toLowerCase());
}

export function mergeRequestItems(
  items: AccountRequestListItem[],
): AccountRequestListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function buildActivityFromRequests(
  items: Array<{
    id: string;
    kind: AccountRequestKind;
    label: string;
    status: string;
    updatedAt: string;
  }>,
  limit = 20,
): Array<{
  id: string;
  kind: AccountRequestKind;
  label: string;
  status: string;
  at: string;
}> {
  return [...items]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      status: row.status,
      at: row.updatedAt,
    }));
}
