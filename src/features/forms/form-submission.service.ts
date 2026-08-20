import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { buildZodSchemaFromTemplate } from "@/features/forms/lib/build-zod-schema";
import { scoreSubmission } from "@/features/forms/lib/scoring";
import { dispatchWebhooks } from "@/features/forms/lib/webhooks";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { sendFormAdminNotification, sendFormSubmitterReply } from "@/features/email/templates";
import { resolveSendProviderConfig } from "@/features/email/email.service";
import { resolveSubmissionEntityRefs } from "@/features/forms/lib/pipeline";
import { resolveReceiverEmails } from "@/features/forms/lib/resolve-receiver-emails";
import { appendInteractionEvent } from "@/features/forms/interaction-event.service";
import type { FormSubmitContext } from "@/features/forms/types";

export async function persistFormSubmission(
  ctx: FormSubmitContext,
  parsed: Record<string, unknown>,
  score: number,
) {
  const template = await getFormTemplateById(ctx.templateId);
  if (!template || !template.isPublished) {
    throw new Error("Form template not found");
  }

  const entityRefs = ctx.entityRefs ?? resolveSubmissionEntityRefs(template.definition);
  const tags = entityRefs.tags ?? [];

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
      pipelineType: entityRefs.pipelineType ?? null,
      assigneeId: entityRefs.assigneeId ?? null,
      tags: tags as object,
      customerId: entityRefs.customerId ?? null,
      companyId: entityRefs.companyId ?? null,
      campaignId: entityRefs.campaignId ?? null,
      metadata: {
        ...(ctx.abTestId || ctx.abVariantId
          ? { abTestId: ctx.abTestId, abVariantId: ctx.abVariantId }
          : {}),
      } as object,
    },
  });

  const webhooks = template.definition.webhooks ?? [];
  if (webhooks.length > 0) {
    void dispatchWebhooks(submission.id, webhooks, parsed);
  }

  const visitorEmail = String(parsed.email ?? "");
  const replyTo = visitorEmail.includes("@") ? visitorEmail : undefined;
  const receiverEmails = resolveReceiverEmails(template.definition);
  const accountId = template.definition.notifications?.accountId;
  const providerConfig = await resolveSendProviderConfig(accountId);

  if (receiverEmails.length) {
    void sendFormAdminNotification({
      to: receiverEmails,
      templateName: template.name,
      payload: parsed,
      submissionId: submission.id,
      score,
      replyTo,
      providerConfig,
    }).then((result) => {
      if (!result.sent) {
        console.error("[forms] receiver notification failed", {
          submissionId: submission.id,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        });
      }
    });
  }

  if (template.definition.notifications?.sendToSubmitter && replyTo) {
    void sendFormSubmitterReply({
      to: replyTo,
      templateName: template.name,
      submissionId: submission.id,
      providerConfig,
    }).then((result) => {
      if (!result.sent) {
        console.error("[forms] submitter reply failed", {
          submissionId: submission.id,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        });
      }
    });
  }

  return { id: submission.id, score, entityRefs };
}

export async function submitForm(
  ctx: FormSubmitContext,
  payload: Record<string, unknown>,
) {
  const template = await getFormTemplateById(ctx.templateId);
  if (!template || !template.isPublished) {
    throw new Error("Form template not found");
  }

  const schema = buildZodSchemaFromTemplate(template.definition, payload);
  const parsed = schema.parse(payload) as Record<string, unknown>;
  const score = scoreSubmission(template.definition, parsed);
  const entityRefs = ctx.entityRefs ?? resolveSubmissionEntityRefs(template.definition);

  return persistFormSubmission(
    { ...ctx, entityRefs },
    parsed,
    score,
  );
}

export async function listFormSubmissions(filters?: {
  templateId?: string;
  blockType?: string;
  status?: "NEW" | "REVIEWED" | "ARCHIVED";
  minScore?: number;
  maxScore?: number;
  pipelineType?: string;
  assigneeId?: string;
}) {
  return prisma.formSubmission.findMany({
    where: {
      templateId: filters?.templateId,
      blockType: filters?.blockType,
      status: filters?.status,
      pipelineType: filters?.pipelineType,
      assigneeId: filters?.assigneeId,
      score: {
        gte: filters?.minScore,
        lte: filters?.maxScore,
      },
    },
    include: { template: { select: { name: true, slug: true, category: true } }, webhooks: true },
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
  const submission = await prisma.formSubmission.update({ where: { id }, data: { status } });

  if (status === "ARCHIVED") {
    await appendInteractionEvent(id, "interaction.archived", { status });
  }

  return submission;
}

export async function updateSubmissionWorkflow(
  id: string,
  input: {
    status?: "NEW" | "REVIEWED" | "ARCHIVED";
    assigneeId?: string | null;
    pipelineType?: string | null;
    tags?: string[];
  },
) {
  const data: {
    status?: "NEW" | "REVIEWED" | "ARCHIVED";
    assigneeId?: string | null;
    pipelineType?: string | null;
    tags?: object;
  } = {};

  if (input.status) data.status = input.status;
  if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;
  if (input.pipelineType !== undefined) data.pipelineType = input.pipelineType;
  if (input.tags) data.tags = input.tags as object;

  const submission = await prisma.formSubmission.update({ where: { id }, data });

  if (input.assigneeId) {
    await appendInteractionEvent(id, "interaction.assigned", { assigneeId: input.assigneeId });
  }
  if (input.tags?.length) {
    await appendInteractionEvent(id, "interaction.tagged", { tags: input.tags });
  }
  if (input.status === "ARCHIVED") {
    await appendInteractionEvent(id, "interaction.archived", { status: input.status });
  }

  return submission;
}

export async function bulkUpdateSubmissionWorkflow(
  ids: string[],
  input: {
    status?: "NEW" | "REVIEWED" | "ARCHIVED";
    assigneeId?: string | null;
    pipelineType?: string | null;
    tags?: string[];
  },
) {
  const results = [];
  for (const id of ids) {
    results.push(await updateSubmissionWorkflow(id, input));
  }
  return results;
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

export async function replyToFormSubmission(input: {
  submissionId: string;
  subject: string;
  body: string;
  markReviewed?: boolean;
}) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) throw new Error("Subject is required.");
  if (!body) throw new Error("Message body is required.");

  const submission = await prisma.formSubmission.findUnique({
    where: { id: input.submissionId },
    include: { template: true },
  });
  if (!submission) throw new Error("Submission not found.");

  const { extractSubmissionContact } = await import("@/features/forms/lib/submission-contact");
  const contact = extractSubmissionContact(submission.payload);
  if (!contact.email) throw new Error("This submission has no visitor email to reply to.");

  const definition = (submission.template?.definition ?? {}) as {
    notifications?: { accountId?: string };
  };
  const accountId = definition.notifications?.accountId;
  const { resolveSendProviderConfig } = await import("@/features/email/email.service");
  const { sendFormSubmissionAdminReply } = await import("@/features/email/templates");
  const providerConfig = await resolveSendProviderConfig(accountId);

  const result = await sendFormSubmissionAdminReply({
    to: contact.email,
    subject,
    body,
    templateName: submission.template?.name ?? "Form",
    providerConfig,
  });
  if (!result.sent) {
    throw new Error(result.errorMessage ?? "Email delivery failed.");
  }

  const prevMeta = (submission.metadata ?? {}) as Record<string, unknown>;
  const prevReplies = Array.isArray(prevMeta.replies) ? prevMeta.replies : [];
  const replyRecord = {
    to: contact.email,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };

  const nextStatus =
    input.markReviewed !== false && submission.status === "NEW"
      ? ("REVIEWED" as const)
      : undefined;

  await prisma.formSubmission.update({
    where: { id: submission.id },
    data: {
      metadata: {
        ...prevMeta,
        replies: [...prevReplies, replyRecord],
      } as object,
      ...(nextStatus ? { status: nextStatus } : {}),
    },
  });

  await appendInteractionEvent(submission.id, "interaction.replied", {
    to: contact.email,
    subject,
  });

  return { to: contact.email, subject };
}

function parseRecipientList(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("@"));
}

export async function forwardFormSubmission(input: {
  submissionId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  includeOriginal: boolean;
}) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  const toList = parseRecipientList(input.to);
  if (toList.length === 0) throw new Error("At least one recipient is required.");
  if (!subject) throw new Error("Subject is required.");
  if (!body && !input.includeOriginal) throw new Error("Message body is required.");

  const submission = await prisma.formSubmission.findUnique({
    where: { id: input.submissionId },
    include: { template: true },
  });
  if (!submission) throw new Error("Submission not found.");

  const {
    extractSubmissionContact,
    getPayloadRecord,
  } = await import("@/features/forms/lib/submission-contact");
  const contact = extractSubmissionContact(submission.payload);
  const templateName = submission.template?.name ?? "Form";
  const when = submission.createdAt.toLocaleString();

  let finalBody = body;
  if (input.includeOriginal) {
    const data = getPayloadRecord(submission.payload);
    const fieldLines = Object.entries(data)
      .filter(([k]) => !["honeypot", "_honeypot", "csrf", "captcha"].includes(k.toLowerCase()))
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}`);
    const originalBlock = [
      "",
      "---------- Original form submission ----------",
      `Form: ${templateName}`,
      `From: ${contact.name || "Unknown"}${contact.email ? ` <${contact.email}>` : ""}`,
      `Received: ${when}`,
      "",
      ...(fieldLines.length > 0 ? fieldLines : [contact.preview]),
    ].join("\n");
    finalBody = `${body}${originalBlock}`.trim();
  }

  const definition = (submission.template?.definition ?? {}) as {
    notifications?: { accountId?: string };
  };
  const accountId = definition.notifications?.accountId;
  const { resolveSendProviderConfig } = await import("@/features/email/email.service");
  const { sendFormSubmissionForward } = await import("@/features/email/templates");
  const providerConfig = await resolveSendProviderConfig(accountId);

  const ccList = parseRecipientList(input.cc);
  const bccList = parseRecipientList(input.bcc);

  const result = await sendFormSubmissionForward({
    to: toList,
    cc: ccList.length ? ccList : undefined,
    bcc: bccList.length ? bccList : undefined,
    subject,
    body: finalBody,
    templateName,
    providerConfig,
  });
  if (!result.sent) {
    throw new Error(result.errorMessage ?? "Email delivery failed.");
  }

  const toJoined = toList.join(", ");
  await appendInteractionEvent(submission.id, "interaction.forwarded", {
    to: toJoined,
    cc: ccList.length ? ccList.join(", ") : undefined,
    bcc: bccList.length ? bccList.join(", ") : undefined,
    subject,
  });

  return { to: toJoined, subject };
}
