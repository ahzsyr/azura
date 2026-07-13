import type { ValidationResult } from "../types";
import type { SeoEntityDescriptor } from "./entity-descriptor";

export type SeoChangeOrigin =
  | "manual"
  | "autofill"
  | "ai"
  | "import"
  | "migration"
  | "automation";

export type ApplyMode = "preview" | "fill_empty" | "replace_generated" | "overwrite_all";

export type SeoWriteTarget = Readonly<{
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  contentItemId?: string;
  entityType?: string;
  entityId?: string;
}>;

export type SeoFieldChange = Readonly<{
  field: string;
  previous: string | null;
  next: string | null;
  action: "apply" | "ignore" | "edit";
  provenance?: string;
  localeCode?: string;
}>;

export type SeoChangeSetStatus = "pending" | "applied" | "partial" | "rejected";

export type SeoChangeSet = Readonly<{
  correlationId: string;
  origin: SeoChangeOrigin;
  descriptor: SeoEntityDescriptor;
  writeTarget: SeoWriteTarget;
  locale: string;
  profileId: string;
  applyMode: ApplyMode;
  fields: ReadonlyArray<SeoFieldChange>;
  metaFields?: Readonly<{
    canonicalUrl?: string | null;
    robots?: string | null;
    focusKeywords?: string | null;
    ogImageUrl?: string | null;
    twitterCard?: string | null;
    jsonLd?: unknown;
  }>;
  validation?: ValidationResult;
  status: SeoChangeSetStatus;
}>;
