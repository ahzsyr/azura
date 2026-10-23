import type { PipelineContext, PipelineMiddleware } from "@/platform/schema-ui/pipeline/command-bus";
import type { SubmitCommand } from "@/platform/schema-ui/manifests/types";
import { mergeFormDefinitionWithSchema } from "@/features/forms/adapters/schema-document.adapter";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { buildZodSchemaFromTemplate } from "@/features/forms/lib/build-zod-schema";
import { assertDeliverableEmail } from "@/lib/security/email-domain.server";

export const formsValidationMiddleware: PipelineMiddleware = async (ctx, next) => {
  const command = ctx.command as SubmitCommand;
  const template = await getFormTemplateById(command.schemaId);
  if (!template) throw new Error("Form template not found");
  if (!template.isPublished) throw new Error("Form template not found");

  const { form } = mergeFormDefinitionWithSchema(template.definition);
  const schema = buildZodSchemaFromTemplate(form, command.bindingValues);
  const parsed = schema.parse(command.bindingValues) as Record<string, unknown>;
  for (const field of form.fields) {
    if (field.type !== "email") continue;
    const value = parsed[field.id];
    if (typeof value !== "string" || !value.trim()) continue;
    await assertDeliverableEmail(value);
  }

  ctx.data.template = template;
  ctx.data.form = form;
  ctx.data.parsed = parsed;
  ctx.data.validated = true;

  return next();
};
