"use server";

import { revalidatePath } from "next/cache";
import type { FormTemplateCategory } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { ok, fail, type ActionResult } from "@/types/api";
import {
  createFormTemplate,
  deleteFormTemplate,
  duplicateFormTemplate,
  getFormTemplateById,
  listFormTemplates,
  slugifyFormName,
  updateFormTemplate,
} from "@/features/forms/form-template.service";
import { buildStarterPack, FORM_STARTERS, type FormStarterId } from "@/features/forms/starters";
import { updateFormSubmissionStatus, bulkUpdateSubmissionWorkflow } from "@/features/forms/form-submission.service";
import {
  publishFormTemplateSnapshot,
  rollbackFormTemplateToSnapshot,
} from "@/features/forms/form-template-snapshot.service";
import { requireFormTemplateAccess } from "@/features/forms/lib/form-permissions";
import { generateSchemaFromPrompt } from "@/platform/schema-ui/ai/schema-generator";
import { resendNewsletterConfirmation } from "@/features/forms/newsletter.service";
import {
  loadDocumentFromRaw,
  type DocumentExtensions,
} from "@/features/forms/lib/document-envelope";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";

export async function listFormTemplatesAction(category?: FormTemplateCategory) {
  await requireAdmin();
  return listFormTemplates(category);
}

export async function saveFormTemplateAction(
  id: string | null,
  input: {
    name: string;
    slug?: string;
    category: FormTemplateCategory;
    description?: string;
    /** Versioned authoring envelope OR SchemaDocument + extensions JSON. */
    definitionJson: string;
    isPublished?: boolean;
  },
): Promise<ActionResult<{ id: string }>> {
  await requireFormTemplateAccess(id);
  try {
    const parsed = JSON.parse(input.definitionJson) as Record<string, unknown>;
    const { document, extensions } = resolveSavePayload(parsed);
    const slug = input.slug?.trim() || slugifyFormName(input.name);

    if (id) {
      await updateFormTemplate(id, {
        name: input.name,
        slug,
        category: input.category,
        description: input.description ?? null,
        document,
        extensions,
        isPublished: input.isPublished,
      });
      revalidatePath("/admin/forms");
      return ok({ id });
    }

    const created = await createFormTemplate({
      name: input.name,
      slug,
      category: input.category,
      description: input.description,
      document,
      extensions,
    });
    revalidatePath("/admin/forms");
    return ok({ id: created.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save template");
  }
}

function resolveSavePayload(parsed: Record<string, unknown>): {
  document: SchemaDocument;
  extensions: DocumentExtensions;
} {
  if (parsed.document != null && typeof parsed.document === "object") {
    return loadDocumentFromRaw(parsed);
  }
  if (Array.isArray(parsed.nodes) || Array.isArray(parsed.bindings)) {
    return loadDocumentFromRaw(parsed);
  }
  throw new Error("Invalid authoring payload: expected SchemaDocument envelope");
}

export async function createFormFromStarterAction(input: {
  starterId: FormStarterId;
  name: string;
  slug: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const starter = buildStarterPack(input.starterId);
    const meta = FORM_STARTERS.find((s) => s.id === input.starterId);
    const created = await createFormTemplate({
      name: input.name,
      slug: input.slug.trim() || slugifyFormName(input.name),
      category: meta?.category ?? "GENERAL",
      document: starter.document,
      extensions: starter.extensions,
      isPublished: false,
    });
    revalidatePath("/admin/forms");
    return ok({ id: created.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create form");
  }
}

export async function deleteFormTemplateAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteFormTemplate(id);
    revalidatePath("/admin/forms");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete");
  }
}

export async function duplicateFormTemplateAction(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const copy = await duplicateFormTemplate(id);
    revalidatePath("/admin/forms");
    return ok({ id: copy.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to duplicate");
  }
}

export async function updateSubmissionStatusAction(
  id: string,
  status: "NEW" | "REVIEWED" | "ARCHIVED",
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await updateFormSubmissionStatus(id, status);
    revalidatePath("/admin/form-submissions");
    revalidatePath("/admin/communications");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update");
  }
}

export async function replyToFormSubmissionAction(input: {
  submissionId: string;
  subject: string;
  body: string;
  markReviewed?: boolean;
}): Promise<ActionResult<{ to: string; subject: string }>> {
  await requireAdmin();
  try {
    const { replyToFormSubmission } = await import("@/features/forms/form-submission.service");
    const result = await replyToFormSubmission(input);
    revalidatePath("/admin/form-submissions");
    revalidatePath(`/admin/form-submissions/${input.submissionId}`);
    revalidatePath("/admin/communications");
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to send reply");
  }
}

export async function forwardFormSubmissionAction(input: {
  submissionId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  includeOriginal: boolean;
}): Promise<ActionResult<{ to: string; subject: string }>> {
  await requireAdmin();
  try {
    const { forwardFormSubmission } = await import("@/features/forms/form-submission.service");
    const result = await forwardFormSubmission(input);
    revalidatePath("/admin/form-submissions");
    revalidatePath(`/admin/form-submissions/${input.submissionId}`);
    revalidatePath("/admin/communications");
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to forward submission");
  }
}

export async function updateSubmissionWorkflowAction(
  id: string,
  input: {
    status?: "NEW" | "REVIEWED" | "ARCHIVED";
    assigneeId?: string | null;
    pipelineType?: string | null;
    tags?: string[];
  },
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await bulkUpdateSubmissionWorkflow([id], input);
    revalidatePath("/admin/communications");
    revalidatePath("/admin/form-submissions");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update");
  }
}

export async function bulkUpdateSubmissionsAction(
  ids: string[],
  input: {
    status?: "NEW" | "REVIEWED" | "ARCHIVED";
    assigneeId?: string | null;
    pipelineType?: string | null;
    tags?: string[];
  },
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await bulkUpdateSubmissionWorkflow(ids, input);
    revalidatePath("/admin/communications");
    revalidatePath("/admin/form-submissions");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update");
  }
}

export async function resendNewsletterConfirmAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const sent = await resendNewsletterConfirmation(id);
    if (!sent) return fail("Cannot resend for this subscriber");
    revalidatePath("/admin/newsletter");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to resend");
  }
}

export async function publishFormTemplateSnapshotAction(
  templateId: string,
  label?: string,
): Promise<ActionResult<{ version: number }>> {
  const session = await requireFormTemplateAccess(templateId);
  try {
    const snapshot = await publishFormTemplateSnapshot(templateId, session.user.id, label);
    revalidatePath(`/admin/forms/${templateId}`);
    return ok({ version: snapshot.version });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to publish");
  }
}

export async function rollbackFormTemplateSnapshotAction(
  templateId: string,
  snapshotId: string,
): Promise<ActionResult<{ version: number }>> {
  const session = await requireFormTemplateAccess(templateId);
  try {
    const snapshot = await rollbackFormTemplateToSnapshot(templateId, snapshotId, session.user.id);
    revalidatePath(`/admin/forms/${templateId}`);
    return ok({ version: snapshot.version });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to rollback");
  }
}

export async function getFormTranslationsAction(
  templateId: string,
  localePrefix: string,
): Promise<ActionResult<{ fieldLabels: Record<string, string>; fieldPlaceholders: Record<string, string> }>> {
  await requireAdmin();
  try {
    const template = await getFormTemplateById(templateId);
    if (!template) return fail("Template not found");
    const { loadFormTemplateTranslations } = await import("@/features/forms/form-template-translation.service");
    const copy = await loadFormTemplateTranslations(templateId, template.definition, localePrefix);
    return ok({ fieldLabels: copy.fieldLabels, fieldPlaceholders: copy.fieldPlaceholders });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load translations");
  }
}

export async function generateFormSchemaAction(
  prompt: string,
): Promise<ActionResult<{ document: unknown }>> {
  await requireAdmin();
  try {
    const document = await generateSchemaFromPrompt({ prompt, featureContext: "form" });
    return ok({ document });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to generate schema");
  }
}

export async function installMarketplaceTemplateAction(
  templateId: string,
): Promise<ActionResult<{ document: unknown }>> {
  await requireAdmin();
  try {
    const { installMarketplaceTemplate } = await import("@/platform/schema-ui/marketplace/install-template");
    const document = installMarketplaceTemplate(templateId);
    return ok({ document });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to install template");
  }
}

export async function getFormEmailDeliveryStatusAction(
  accountId?: string | null,
): Promise<
  ActionResult<{
    configured: boolean;
    provider: "resend" | "smtp" | "none";
    from: string;
    source: "account" | "env" | "none";
    accountId?: string;
    accountName?: string;
    message?: string;
  }>
> {
  await requireAdmin();
  const { getEmailDeliveryStatusForAccount } = await import("@/features/email/email.service");
  return ok(await getEmailDeliveryStatusForAccount(accountId));
}

export async function sendFormNotificationTestAction(input: {
  emails: string[];
  templateName?: string;
  accountId?: string | null;
}): Promise<ActionResult<{ sent: boolean }>> {
  await requireAdmin();
  try {
    const emails = input.emails.map((e) => e.trim()).filter((e) => e.includes("@"));
    if (!emails.length) {
      return fail("Add at least one valid receiver email before sending a test.");
    }
    const { sendFormNotificationTest } = await import("@/features/email/templates");
    const result = await sendFormNotificationTest({
      to: emails,
      templateName: input.templateName,
      accountId: input.accountId,
    });
    if (!result.sent) {
      return fail(result.errorMessage ?? "Email delivery failed.");
    }
    return ok({ sent: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to send test email");
  }
}
