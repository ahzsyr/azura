export type ActivityItem = {
  id: string;
  /** ISO timestamp for sorting / machine use */
  at: string;
  /** Preformatted display label (stable across SSR/hydration) */
  atLabel: string;
  title: string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "muted";
};

/** Stable UTC label so SSR and client hydration match (avoids React #418). */
export function formatActivityTime(at: Date | string): string {
  const d = typeof at === "string" ? new Date(at) : at;
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function toIso(at: Date | string): string {
  return (typeof at === "string" ? new Date(at) : at).toISOString();
}

function item(
  partial: Omit<ActivityItem, "at" | "atLabel"> & { at: Date | string },
): ActivityItem {
  return {
    id: partial.id,
    at: toIso(partial.at),
    atLabel: formatActivityTime(partial.at),
    title: partial.title,
    detail: partial.detail,
    tone: partial.tone,
  };
}

export function buildSubmissionActivityItems(input: {
  createdAt: Date;
  score: number;
  status: string;
  assigneeId?: string | null;
  pipelineType?: string | null;
  metadata?: Record<string, unknown>;
  events: Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    timestamp: Date;
  }>;
  webhooks: Array<{
    id: string;
    url: string;
    status: string;
    responseCode: number | null;
    createdAt: Date;
  }>;
}): ActivityItem[] {
  const items: ActivityItem[] = [];
  const meta = input.metadata ?? {};
  const ua = typeof meta.userAgent === "string" ? meta.userAgent : "";
  const device = typeof meta.device === "string" ? meta.device : ua.includes("Mobile") ? "Mobile" : "Desktop";
  const browser = typeof meta.browser === "string" ? meta.browser : "";

  items.push(
    item({
      id: "opened",
      at: input.createdAt,
      title: "Opened",
      detail: [browser, device].filter(Boolean).join(" · ") || undefined,
      tone: "muted",
    }),
  );

  for (const ev of input.events) {
    items.push(
      item({
        id: ev.id,
        at: ev.timestamp,
        title: humanizeEventType(ev.type),
        detail: summarizePayload(ev.type, ev.payload),
        tone: ev.type.includes("fail") || ev.type.includes("error") ? "warning" : "default",
      }),
    );
  }

  items.push(
    item({
      id: "score",
      at: input.createdAt,
      title: "Score",
      detail: String(input.score),
    }),
  );

  if (input.assigneeId) {
    items.push(
      item({
        id: "assigned",
        at: input.createdAt,
        title: "Assigned",
        detail: input.assigneeId,
      }),
    );
  }

  for (const w of input.webhooks) {
    items.push(
      item({
        id: w.id,
        at: w.createdAt,
        title: "Webhook",
        detail: `${w.status}${w.responseCode ? ` (${w.responseCode})` : ""} · ${w.url}`,
        tone: w.status === "SUCCESS" || w.status === "DELIVERED" ? "success" : "warning",
      }),
    );
  }

  if (input.pipelineType) {
    items.push(
      item({
        id: "pipeline",
        at: input.createdAt,
        title: "Pipeline",
        detail: input.pipelineType,
      }),
    );
  }

  items.push(
    item({
      id: "status",
      at: input.createdAt,
      title: "Status",
      detail: input.status,
    }),
  );

  // Newest first
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function humanizeEventType(type: string): string {
  const map: Record<string, string> = {
    "interaction.submitted": "Submitted",
    "interaction.created": "Created",
    "interaction.assigned": "Assigned",
    "interaction.tagged": "Tagged",
    "interaction.replied": "Reply Sent",
    "interaction.forwarded": "Forwarded",
    "interaction.archived": "Archived",
    "schema.viewed": "Viewed",
    "binding.changed": "Field changed",
    "step.completed": "Step completed",
  };
  return map[type] ?? type.replace(/\./g, " ");
}

function summarizePayload(type: string, payload: Record<string, unknown>): string | undefined {
  if (type === "interaction.forwarded" && payload.to) {
    return `To: ${String(payload.to)}`;
  }
  const parts: string[] = [];
  if (payload.assigneeId) parts.push(`Assignee ${String(payload.assigneeId)}`);
  if (payload.tags) parts.push(`Tags ${JSON.stringify(payload.tags)}`);
  if (payload.stepTitle) parts.push(String(payload.stepTitle));
  if (payload.bindingId) parts.push(`Field ${String(payload.bindingId)}`);
  if (payload.to) parts.push(`To ${String(payload.to)}`);
  if (payload.subject) parts.push(String(payload.subject));
  return parts.length ? parts.join(" · ") : undefined;
}
