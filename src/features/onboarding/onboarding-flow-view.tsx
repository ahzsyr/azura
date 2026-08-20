"use client";

import { SurveyView } from "@/features/surveys/survey-view";
import type { FormTemplateDefinition } from "@/features/forms/types";

type Props = {
  templateId: string;
  definition: FormTemplateDefinition;
  definitionRaw?: unknown;
  locale: string;
  successMessage?: string;
};

/** Onboarding flow — thin consumer over schema runtime (single or multi-step surveys). */
export function OnboardingFlowView({
  templateId,
  definition,
  definitionRaw,
  locale,
  successMessage = "You're all set!",
}: Props) {
  const multiStep = Boolean(definition.steps?.length);

  return (
    <SurveyView
      templateId={templateId}
      definition={definition}
      definitionRaw={definitionRaw}
      locale={locale}
      blockType="onboarding"
      multiStep={multiStep}
      saveAndResume={multiStep}
      progressStyle="steps"
      successMessage={successMessage}
    />
  );
}
