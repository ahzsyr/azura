"use server";

import { revalidatePath } from "next/cache";
import type { FormTemplateCategory } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { ok, fail, type ActionResult } from "@/types/api";
import {
  createFormTemplate,
  deleteFormTemplate,
  duplicateFormTemplate,
  listFormTemplates,
  slugifyFormName,
  updateFormTemplate,
} from "@/features/forms/form-template.service";
import { updateFormSubmissionStatus } from "@/features/forms/form-submission.service";
import { resendNewsletterConfirmation } from "@/features/forms/newsletter.service";
import { parseFormTemplateDefinition } from "@/features/forms/schemas/form-definition";

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
    definitionJson: string;
    isPublished?: boolean;
  },
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const definition = parseFormTemplateDefinition(JSON.parse(input.definitionJson));
    const slug = input.slug?.trim() || slugifyFormName(input.name);

    if (id) {
      await updateFormTemplate(id, {
        name: input.name,
        slug,
        category: input.category,
        description: input.description ?? null,
        definition,
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
      definition,
    });
    revalidatePath("/admin/forms");
    return ok({ id: created.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save template");
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
