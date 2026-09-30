"use client";

import { DynamicFormView } from "@/features/builder/blocks/conversion/components/dynamic-form-view";
import type { FormTemplateDefinition } from "@/features/forms/types";

type Props = {
  templateId: string;
  definition: FormTemplateDefinition;
  definitionRaw?: unknown;
  locale: string;
  blockType?: string;
  blockId?: string;
  pageSlug?: string;
  multiStep?: boolean;
  saveAndResume?: boolean;
  progressStyle?: "bar" | "steps" | "dots";
  successMessage?: string;
  onSuccess?: (result: { id: string; score: number }) => void;
};

/** Thin survey consumer wrapping SchemaRuntime via DynamicFormView. */
export function SurveyView({
  templateId,
  definition,
  definitionRaw,
  locale,
  blockType = "survey",
  blockId,
  pageSlug,
  multiStep,
  saveAndResume,
  progressStyle,
  successMessage = "Thank you for your feedback!",
  onSuccess,
}: Props) {
  return (
    <DynamicFormView
      templateId={templateId}
      definition={definition}
      definitionRaw={definitionRaw}
      locale={locale}
      blockType={blockType}
      blockId={blockId}
      pageSlug={pageSlug}
      multiStep={multiStep}
      saveAndResume={saveAndResume}
      progressStyle={progressStyle}
      successMessage={successMessage}
      onSuccess={onSuccess}
    />
  );
}
