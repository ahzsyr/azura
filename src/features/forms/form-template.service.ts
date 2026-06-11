import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { FormTemplateCategory } from "@prisma/client";
import { parseFormTemplateDefinition } from "@/features/forms/schemas/form-definition";
import type { FormTemplateDefinition } from "@/features/forms/types";

export type FormTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  description: string | null;
  definition: FormTemplateDefinition;
  isPublished: boolean;
  updatedAt: Date;
};

function toRecord(row: {
  id: string;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  description: string | null;
  definition: unknown;
  isPublished: boolean;
  updatedAt: Date;
}): FormTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
    definition: parseFormTemplateDefinition(row.definition),
    isPublished: row.isPublished,
    updatedAt: row.updatedAt,
  };
}

export async function listFormTemplates(category?: FormTemplateCategory) {
  const rows = await prisma.formTemplate.findMany({
    where: category ? { category } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toRecord);
}

export async function getFormTemplateById(id: string) {
  const row = await prisma.formTemplate.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}

export async function getFormTemplateBySlug(slug: string) {
  const row = await prisma.formTemplate.findUnique({ where: { slug } });
  return row ? toRecord(row) : null;
}

export async function createFormTemplate(input: {
  name: string;
  slug: string;
  category?: FormTemplateCategory;
  description?: string;
  definition?: FormTemplateDefinition;
}) {
  const definition = input.definition ?? defaultDefinitionForCategory(input.category ?? "GENERAL");
  const row = await prisma.formTemplate.create({
    data: {
      name: input.name,
      slug: input.slug,
      category: input.category ?? "GENERAL",
      description: input.description,
      definition: definition as object,
    },
  });
  return toRecord(row);
}

export async function updateFormTemplate(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    category: FormTemplateCategory;
    description: string | null;
    definition: FormTemplateDefinition;
    isPublished: boolean;
  }>,
) {
  const row = await prisma.formTemplate.update({
    where: { id },
    data: {
      ...input,
      definition: input.definition ? (input.definition as object) : undefined,
    },
  });
  return toRecord(row);
}

export async function deleteFormTemplate(id: string) {
  await prisma.formTemplate.delete({ where: { id } });
}

export async function duplicateFormTemplate(id: string) {
  const source = await getFormTemplateById(id);
  if (!source) throw new Error("Template not found");
  const slug = `${source.slug}-copy-${Date.now().toString(36).slice(-4)}`;
  return createFormTemplate({
    name: `${source.name} (Copy)`,
    slug,
    category: source.category,
    description: source.description ?? undefined,
    definition: source.definition,
  });
}

function defaultDefinitionForCategory(category: FormTemplateCategory): FormTemplateDefinition {
  if (category === "LEAD") {
    return {
      fields: [
        { id: "name", type: "text", labelEn: "Name", labelAr: "الاسم", required: true },
        { id: "email", type: "email", labelEn: "Email", labelAr: "البريد", required: true },
        { id: "phone", type: "phone", labelEn: "Phone", labelAr: "الهاتف", required: false },
        { id: "company", type: "text", labelEn: "Company", labelAr: "الشركة", required: false },
      ],
      scoringRules: [{ fieldId: "company", match: ".+", points: 10 }],
      notifications: { adminEmails: [], sendToSubmitter: false },
      webhooks: [],
    };
  }
  if (category === "CONTACT") {
    return {
      fields: [
        { id: "name", type: "text", labelEn: "Name", labelAr: "الاسم", required: true },
        { id: "email", type: "email", labelEn: "Email", labelAr: "البريد", required: true },
        { id: "message", type: "textarea", labelEn: "Message", labelAr: "الرسالة", required: true },
      ],
      notifications: { adminEmails: [], sendToSubmitter: true },
      webhooks: [],
    };
  }
  if (category === "MULTI_STEP") {
    return {
      fields: [
        { id: "name", type: "text", labelEn: "Name", labelAr: "الاسم", required: true },
        { id: "email", type: "email", labelEn: "Email", labelAr: "البريد", required: true },
        { id: "details", type: "textarea", labelEn: "Details", labelAr: "التفاصيل", required: false },
      ],
      steps: [
        { id: "step1", titleEn: "Contact", titleAr: "التواصل", fieldIds: ["name", "email"] },
        { id: "step2", titleEn: "Details", titleAr: "التفاصيل", fieldIds: ["details"] },
      ],
      notifications: { adminEmails: [], sendToSubmitter: false },
    };
  }
  return { fields: [], notifications: { adminEmails: [], sendToSubmitter: false } };
}

export function slugifyFormName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || `form-${crypto.randomBytes(4).toString("hex")}`;
}
