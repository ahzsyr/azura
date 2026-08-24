import "server-only";

import { requireAdmin } from "@/features/auth/guards";
import { getFormTemplateById } from "@/features/forms/form-template.service";

export async function requireFormTemplateAccess(templateId: string | null | undefined) {
  const session = await requireAdmin();
  if (!templateId) return session;

  const template = await getFormTemplateById(templateId);
  if (!template) throw new Error("Template not found");

  const allowed = template.definition.allowedAdminIds ?? [];
  if (allowed.length === 0) return session;

  if (!allowed.includes(session.user.id)) {
    throw new Error("Forbidden: no access to this form template");
  }

  return session;
}

export function parseAllowedAdminIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}
