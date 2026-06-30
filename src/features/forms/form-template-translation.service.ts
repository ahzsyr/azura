import "server-only";

import { localeService } from "@/features/i18n/locale.service";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { translationService } from "@/features/translation/translation.service";
import {
  makeFormFieldEntityId,
  makeFormStepEntityId,
} from "@/features/translation/workspace-entity-ids";
import type { FormFieldDefinition, FormStepDefinition, FormTemplateDefinition } from "@/features/forms/types";

export type ResolvedFormTemplateCopy = {
  fieldLabels: Record<string, string>;
  fieldPlaceholders: Record<string, string>;
  stepTitles: Record<string, string>;
};

function resolveFieldFromRows(
  rows: Awaited<ReturnType<typeof translationService.getForEntity>>,
  field: string,
  localeCode: string,
  enabledLocales: Awaited<ReturnType<typeof localeService.listEnabled>>,
  defaultCode: string,
  legacy?: string
): string {
  const value = resolveTranslation(field, localeCode, {
    translations: rows,
    enabledLocales,
    defaultCode,
  });
  return value.trim() || legacy?.trim() || "";
}

export async function loadFormTemplateTranslations(
  templateId: string,
  definition: FormTemplateDefinition,
  localePrefix: string
): Promise<ResolvedFormTemplateCopy> {
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";
  const localeCode = resolvePrefixToCode(localePrefix, enabledLocales);

  const fieldLabels: Record<string, string> = {};
  const fieldPlaceholders: Record<string, string> = {};
  const stepTitles: Record<string, string> = {};

  await Promise.all(
    (definition.fields ?? []).map(async (field: FormFieldDefinition) => {
      const entityId = makeFormFieldEntityId(templateId, field.id);
      const rows = await translationService.getForEntity("FormField", entityId);
      fieldLabels[field.id] = resolveFieldFromRows(
        rows,
        "label",
        localeCode,
        enabledLocales,
        defaultCode,
        field.label || field.label
      );
      fieldPlaceholders[field.id] = resolveFieldFromRows(
        rows,
        "placeholder",
        localeCode,
        enabledLocales,
        defaultCode,
        field.placeholder || field.placeholder
      );
    })
  );

  await Promise.all(
    (definition.steps ?? []).map(async (step: FormStepDefinition) => {
      const entityId = makeFormStepEntityId(templateId, step.id);
      const rows = await translationService.getForEntity("FormStep", entityId);
      stepTitles[step.id] = resolveFieldFromRows(
        rows,
        "title",
        localeCode,
        enabledLocales,
        defaultCode,
        step.title || step.title
      );
    })
  );

  return { fieldLabels, fieldPlaceholders, stepTitles };
}
