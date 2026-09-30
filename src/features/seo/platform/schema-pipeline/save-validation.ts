import type { SeoStructuredConfig } from "@/features/seo/types";
import type { SchemaNode } from "./types";
import { stripEmptyValues } from "./graph/deep-merge";
import { validateOverrideNodes, buildGeneratedNodesOnly } from "./graph/graph-engine";
import { createHomeContextFixture } from "./__tests__/fixtures";
import { SCHEMA_ID_ORGANIZATION, SCHEMA_ID_WEBSITE } from "./constants";

export class StructuredDataSaveError extends Error {
  readonly diagnostics: Array<{ code: string; message: string }>;

  constructor(message: string, diagnostics: Array<{ code: string; message: string }>) {
    super(message);
    this.name = "StructuredDataSaveError";
    this.diagnostics = diagnostics;
  }
}

function assertCanonicalOverrideId(node: SchemaNode, expectedFragment: string): void {
  const id = node["@id"];
  if (typeof id !== "string" || !id.endsWith(`#${expectedFragment}`)) {
    throw new StructuredDataSaveError(
      `Override @id must use canonical fragment #${expectedFragment}.`,
      [{ code: "PROTECTED_IDENTITY_MUTATION", message: `Invalid @id for #${expectedFragment}.` }],
    );
  }
}

export function parseOverrideJson(raw: string | null | undefined): SchemaNode | undefined {
  if (!raw?.trim()) return undefined;
  return stripEmptyValues(JSON.parse(raw) as SchemaNode);
}

/** Validate site-level JSON overrides against protected identity rules. */
export function validateStructuredConfigOverrides(
  input: {
    organization?: SchemaNode;
    website?: SchemaNode;
  },
  config?: SeoStructuredConfig,
): void {
  const overrideNodes: SchemaNode[] = [];
  if (input.organization) {
    assertCanonicalOverrideId(input.organization, SCHEMA_ID_ORGANIZATION);
    overrideNodes.push(input.organization);
  }
  if (input.website) {
    assertCanonicalOverrideId(input.website, SCHEMA_ID_WEBSITE);
    overrideNodes.push(input.website);
  }

  if (!overrideNodes.length) return;

  const ctx = createHomeContextFixture();
  if (config) {
    ctx.site.structuredConfig = { ...ctx.site.structuredConfig, ...config };
  }
  const generated = buildGeneratedNodesOnly(ctx);
  const diagnostics = validateOverrideNodes(generated, overrideNodes);
  const errors = diagnostics.filter((d) => d.severity === "error");
  if (errors.length) {
    throw new StructuredDataSaveError(
      errors.map((e) => e.message).join(" "),
      errors.map((e) => ({ code: e.code, message: e.message })),
    );
  }
}

export function buildConfigFromFormData(formData: FormData): SeoStructuredConfig {
  const organizationRaw = formData.get("organization") as string;
  const websiteRaw = formData.get("website") as string;
  const entityTypeRaw = formData.get("entityType") as string;
  const builderFlagsRaw = formData.get("builderFlags") as string;
  const typeRepresentationRaw = formData.get("typeRepresentation") as string;

  let builderFlags: Record<string, boolean> | undefined;
  if (builderFlagsRaw?.trim()) {
    builderFlags = JSON.parse(builderFlagsRaw) as Record<string, boolean>;
  }

  const entityType = entityTypeRaw?.trim() || undefined;
  const config: SeoStructuredConfig = {
    entityType,
    entityTypePinned: Boolean(entityType),
    typeRepresentation:
      typeRepresentationRaw === "explicit-supertypes" ? "explicit-supertypes" : "most-specific",
    builderFlags,
  };

  const organization = parseOverrideJson(organizationRaw);
  const website = parseOverrideJson(websiteRaw);

  validateStructuredConfigOverrides({ organization, website }, config);

  return {
    ...config,
    ...(organization ? { organization } : {}),
    ...(website ? { website } : {}),
  };
}
