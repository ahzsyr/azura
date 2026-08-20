/** Helpers for form submission inbox / reply UX. */

/** Human-facing reference shown on success screen, emails, and admin inbox. */
export function formatSubmissionReference(submissionId: string): string {
  return `#${submissionId.slice(0, 8).toUpperCase()}`;
}

export function getPayloadRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export function extractSubmissionContact(payload: unknown): {
  email: string | null;
  name: string | null;
  phone: string | null;
  company: string | null;
  preview: string;
} {
  const data = getPayloadRecord(payload);
  const emailRaw = data.email ?? data.Email ?? data.visitorEmail;
  const email =
    typeof emailRaw === "string" && emailRaw.includes("@") ? emailRaw.trim() : null;

  const nameRaw = data.name ?? data.fullName ?? data.full_name ?? data.Name;
  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : null;

  const phoneRaw = data.phone ?? data.Phone ?? data.tel ?? data.mobile ?? data.Mobile;
  const phone = typeof phoneRaw === "string" && phoneRaw.trim() ? phoneRaw.trim() : null;

  const companyRaw =
    data.company ?? data.Company ?? data.organization ?? data.Organisation ?? data.business;
  const company =
    typeof companyRaw === "string" && companyRaw.trim() ? companyRaw.trim() : null;

  const messageRaw =
    data.message ?? data.details ?? data.description ?? data.feedback ?? data.subject;
  let preview =
    typeof messageRaw === "string" && messageRaw.trim()
      ? messageRaw.trim()
      : Object.entries(data)
          .filter(([k]) => !["email", "name", "honeypot"].includes(k.toLowerCase()))
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${String(v ?? "")}`)
          .join(" · ");

  if (preview.length > 120) preview = `${preview.slice(0, 117)}…`;
  return { email, name, phone, company, preview: preview || "(empty submission)" };
}

/** Build a mailto URL that forwards the submission content. */
export function buildForwardMailto(input: {
  templateName: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
  createdAt: Date | string;
  payload: unknown;
}): string {
  const contact = extractSubmissionContact(input.payload);
  const name = input.visitorName ?? contact.name;
  const email = input.visitorEmail ?? contact.email;
  const formName = input.templateName || "Form submission";
  const when =
    typeof input.createdAt === "string"
      ? new Date(input.createdAt).toLocaleString()
      : input.createdAt.toLocaleString();

  const subject = `Fwd: ${formName}${name ? ` — ${name}` : ""}`;
  const data = getPayloadRecord(input.payload);
  const fieldLines = Object.entries(data)
    .filter(([k]) => !["honeypot"].includes(k.toLowerCase()))
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}`);

  const lines = [
    "---------- Forwarded form submission ----------",
    `Form: ${formName}`,
    `From: ${name || "Unknown"}${email ? ` <${email}>` : ""}`,
    `Received: ${when}`,
    "",
    ...(fieldLines.length > 0 ? fieldLines : [contact.preview]),
  ];

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
