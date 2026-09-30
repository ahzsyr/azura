import { randomUUID } from "node:crypto";
import type { SeoSuggestion } from "../types";
import type {
  ApplyMode,
  SeoChangeOrigin,
  SeoChangeSet,
  SeoFieldChange,
  SeoWriteTarget,
} from "../types/change-set";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { SeoDiffResult } from "../types/autofill";
import { resolveWriteTarget } from "./write-target.resolver";

const TRANSLATABLE_FIELDS = new Set(["metaTitle", "metaDescription", "ogTitle", "ogDescription"]);

function isEmpty(value: string | null | undefined): boolean {
  return !value?.trim();
}

function hasGeneratedProvenance(suggestion: SeoSuggestion, field: string): boolean {
  const chain = suggestion.provenance[field];
  if (!chain?.length) return true;
  return !chain.some((step) => step.label.toLowerCase().includes("manual"));
}

function shouldIncludeField(
  applyMode: ApplyMode,
  field: string,
  current: string | null,
  suggested: string | null,
  suggestion: SeoSuggestion,
  selected?: ReadonlySet<string>
): boolean {
  if (!suggested?.trim()) return false;
  if (selected && !selected.has(field)) return false;

  switch (applyMode) {
    case "preview":
      return true;
    case "fill_empty":
      return isEmpty(current);
    case "replace_generated":
      return hasGeneratedProvenance(suggestion, field);
    case "overwrite_all":
      return true;
    default:
      return false;
  }
}

export function buildChangeSet(input: {
  correlationId?: string;
  origin: SeoChangeOrigin;
  descriptor: SeoEntityDescriptor;
  writeTarget?: SeoWriteTarget;
  locale: string;
  profileId: string;
  applyMode: ApplyMode;
  suggestion: SeoSuggestion;
  diff: SeoDiffResult;
  fieldSelection?: ReadonlyArray<string>;
}): SeoChangeSet {
  const writeTarget = input.writeTarget ?? resolveWriteTarget(input.descriptor);
  const selected = input.fieldSelection ? new Set(input.fieldSelection) : undefined;
  const fields: SeoFieldChange[] = [];

  for (const row of input.diff.fields) {
    if (
      !shouldIncludeField(
        input.applyMode,
        row.field,
        row.current,
        row.suggested,
        input.suggestion,
        selected
      )
    ) {
      continue;
    }

    fields.push(
      Object.freeze({
        field: row.field,
        previous: row.current,
        next: row.suggested,
        action: "apply" as const,
        provenance: input.suggestion.source,
        localeCode: TRANSLATABLE_FIELDS.has(row.field) ? input.locale : undefined,
      })
    );
  }

  const metaFields = {
    canonicalUrl: input.suggestion.canonicalUrl ?? null,
    robots: input.suggestion.robots ?? null,
    focusKeywords: input.suggestion.focusKeywords ?? null,
    ogImageUrl: input.suggestion.ogImageUrl ?? null,
    twitterCard: input.suggestion.twitterCard ?? null,
    jsonLd: input.suggestion.jsonLd,
  };

  const status = input.applyMode === "preview" ? "pending" : "pending";

  return Object.freeze({
    correlationId: input.correlationId ?? randomUUID(),
    origin: input.origin,
    descriptor: input.descriptor,
    writeTarget,
    locale: input.locale,
    profileId: input.profileId,
    applyMode: input.applyMode,
    fields: Object.freeze(fields),
    metaFields: Object.freeze(metaFields),
    status,
  });
}

export const changeSetBuilder = {
  build: buildChangeSet,
};
