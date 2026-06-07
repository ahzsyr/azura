import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { buildZodSchemaFromTemplate } from "@/features/forms/lib/build-zod-schema";
import { scoreSubmission } from "@/features/forms/lib/scoring";
import { dispatchWebhooks } from "@/features/forms/lib/webhooks";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { sendFormAdminNotification, sendFormSubmitterReply } from "@/features/email/templates";
import type { FormSubmitContext } from "@/features/forms/types";

export async function submitForm(
  ctx: FormSubmitContext,
  payload: Record<string, unknown>,
) {
  const template = await getFormTemplateById(ctx.templateId);
  if (!template || !template.isPublished) {
    throw new Error("Form template not found");
  }

  const schema = buildZodSchemaFromTemplate(template.definition);
  const parsed = schema.parse(payload);
  const score = scoreSubmission(template.definition, parsed);

  const submission = await prisma.formSubmission.create({
    data: {
      templateId: template.id,
      blockType: ctx.blockType,
      blockId: ctx.blockId,
      pageId: ctx.pageId,
      pageSlug: ctx.pageSlug,
      locale: ctx.locale,
      payload: parsed as object,
      score,
      utm: (ctx.utm ?? {}) as object,
    },
  });

  const webhooks = template.definition.webhooks ?? [];
  if (webhooks.length > 0) {
    void dispatchWebhooks(submission.id, webhooks, parsed);
  }

  const notifications = template.definition.notifications;
  if (notifications?.adminEmails?.length) {
    void sendFormAdminNotification({
      to: notifications.adminEmails,
      templateName: template.name,
      payload: parsed,
      submissionId: submission.id,
      score,
    });
  }

  if (notifications?.sendToSubmitter) {
    const email = String(parsed.email ?? "");
    if (email.includes("@")) {
      void sendFormSubmitterReply({ to: email, templateName: template.name });
    }
  }

  return { id: submission.id, score };
}

export async function listFormSubmissions(filters?: {
  templateId?: string;
  blockType?: string;
  status?: "NEW" | "REVIEWED" | "ARCHIVED";
  minScore?: number;
  maxScore?: number;
}) {
  return prisma.formSubmission.findMany({
    where: {
      templateId: filters?.templateId,
      blockType: filters?.blockType,
      status: filters?.status,
      score: {
        gte: filters?.minScore,
        lte: filters?.maxScore,
      },
    },
    include: { template: { select: { name: true, slug: true } }, webhooks: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getFormSubmission(id: string) {
  return prisma.formSubmission.findUnique({
    where: { id },
    include: { template: true, webhooks: true },
  });
}

export async function updateFormSubmissionStatus(
  id: string,
  status: "NEW" | "REVIEWED" | "ARCHIVED",
) {
  return prisma.formSubmission.update({ where: { id }, data: { status } });
}

export function createDraftToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function saveFormDraft(input: {
  templateId: string;
  token?: string;
  payload: Record<string, unknown>;
  currentStep: number;
}) {
  const token = input.token ?? createDraftToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const existing = input.token
    ? await prisma.formDraft.findUnique({ where: { token: input.token } })
    : null;

  if (existing) {
    return prisma.formDraft.update({
      where: { token },
      data: {
        payload: input.payload as object,
        currentStep: input.currentStep,
        expiresAt,
      },
    });
  }

  return prisma.formDraft.create({
    data: {
      token,
      templateId: input.templateId,
      payload: input.payload as object,
      currentStep: input.currentStep,
      expiresAt,
    },
  });
}

export async function loadFormDraft(token: string) {
  const draft = await prisma.formDraft.findUnique({
    where: { token },
    include: { template: true },
  });
  if (!draft || draft.expiresAt < new Date()) return null;
  return draft;
}
