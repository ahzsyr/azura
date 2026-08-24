/** Client-safe CSV export for form submissions (no Prisma imports). */

export type SubmissionCsvRow = {
  id: string;
  templateName: string;
  status: string;
  score: number;
  assigneeId?: string | null;
  tags?: unknown;
  locale: string;
  createdAt: Date | string;
  payload: unknown;
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function flattenPayload(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value == null) {
      out[key] = "";
    } else if (typeof value === "object") {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

function tagsToString(tags: unknown): string {
  if (Array.isArray(tags)) return tags.map(String).join("|");
  if (tags == null) return "";
  return String(tags);
}

export function submissionsToCsv(rows: SubmissionCsvRow[]): string {
  const payloadKeys = new Set<string>();
  const flattened = rows.map((r) => {
    const flat = flattenPayload(r.payload);
    for (const key of Object.keys(flat)) payloadKeys.add(key);
    return flat;
  });
  const keys = [...payloadKeys].sort();

  const header = [
    "id",
    "template",
    "status",
    "score",
    "assignee",
    "tags",
    "locale",
    "createdAt",
    ...keys,
  ];

  const lines = rows.map((r, i) => {
    const flat = flattened[i];
    const createdAt =
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
    const cells = [
      r.id,
      r.templateName,
      r.status,
      String(r.score),
      r.assigneeId ?? "",
      tagsToString(r.tags),
      r.locale,
      createdAt,
      ...keys.map((k) => flat[k] ?? ""),
    ];
    return cells.map(csvEscape).join(",");
  });

  return [header.map(csvEscape).join(","), ...lines].join("\n");
}
