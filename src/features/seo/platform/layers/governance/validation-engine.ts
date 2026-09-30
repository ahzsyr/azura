import { pluginSdk } from "../../plugin-sdk";
import { seoEventBus } from "../../event-bus/bus";
import type { ValidationInput, ValidationResult, ValidationViolation } from "../../types";

function titleViolation(title: string | undefined, locale: string): ValidationViolation[] {
  const len = title?.trim().length ?? 0;
  if (len === 0) {
    return [
      {
        id: `title-missing-${locale}`,
        field: "metaTitle",
        severity: "critical",
        message: `Meta title (${locale}) is missing`,
      },
    ];
  }
  if (len < 30 || len > 60) {
    return [
      {
        id: `title-length-${locale}`,
        field: "metaTitle",
        severity: "warn",
        message: `Meta title (${locale}) is ${len} chars (aim 30–60)`,
      },
    ];
  }
  return [];
}

function descriptionViolation(desc: string | undefined, locale: string): ValidationViolation[] {
  const len = desc?.trim().length ?? 0;
  if (len === 0) {
    return [
      {
        id: `desc-missing-${locale}`,
        field: "metaDescription",
        severity: "warn",
        message: `Meta description (${locale}) is missing`,
      },
    ];
  }
  if (len < 120 || len > 160) {
    return [
      {
        id: `desc-length-${locale}`,
        field: "metaDescription",
        severity: "warn",
        message: `Meta description (${locale}) is ${len} chars (aim 120–160)`,
      },
    ];
  }
  return [];
}

function scoreFromViolations(violations: ValidationViolation[]): number {
  const weights = { critical: 15, warn: 8, info: 3 };
  const max = 100;
  const penalty = violations.reduce((sum, v) => sum + weights[v.severity], 0);
  return Math.max(0, Math.min(100, max - penalty));
}

export async function runValidation(input: ValidationInput): Promise<ValidationResult> {
  const violations: ValidationViolation[] = [];

  const suggestion = input.suggestion;
  violations.push(...titleViolation(suggestion?.metaTitle, input.snapshot.localeCode));
  violations.push(...descriptionViolation(suggestion?.metaDescription, input.snapshot.localeCode));

  if (!suggestion?.ogImageUrl?.trim() && input.snapshot.images.length === 0) {
    violations.push({
      id: "og-image-missing",
      field: "ogImageUrl",
      severity: "warn",
      message: "No OG image set",
    });
  }

  if (input.snapshot.signals.h1Count === 0) {
    violations.push({
      id: "h1-missing",
      severity: "warn",
      message: "Page has no H1 heading in content",
    });
  }

  for (const validator of pluginSdk.getValidators()) {
    violations.push(...validator.validate(input));
  }

  const fieldScores: Record<string, number> = {
    metaTitle: suggestion?.metaTitle?.trim() ? 100 : 0,
    metaDescription: suggestion?.metaDescription?.trim() ? 100 : 0,
  };

  const result: ValidationResult = Object.freeze({
    score: scoreFromViolations(violations),
    violations: Object.freeze([...violations]),
    fieldScores: Object.freeze({ ...fieldScores }),
  });

  return result;
}

export async function validateAndEmit(
  ctx: import("../../types").SeoExecutionContext,
  input: ValidationInput
): Promise<ValidationResult> {
  const result = await runValidation(input);
  await seoEventBus.emit("validation.completed", { ctx, validation: result });
  return result;
}
