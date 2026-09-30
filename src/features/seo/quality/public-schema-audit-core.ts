import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  buildAllowedHosts,
  normalizeAuditUrlWithOrigin,
  type NormalizedAuditUrl,
} from "./public-schema-audit-url";

export {
  PUBLIC_SCHEMA_AUDIT_ROUTES,
  type PublicSchemaAuditRoute,
} from "./public-schema-audit-routes";

/** Allowed public hosts for HTML audit fetches. */
export async function getAllowedAuditHosts(): Promise<Set<string>> {
  const origin = await resolveSiteOrigin("public");
  const extra = process.env.SEO_AUDIT_ALLOWED_HOSTS?.split(",") ?? [];
  return buildAllowedHosts(origin, extra);
}

/** Validate and normalize a URL/path for SSRF-safe public HTML audit. */
export async function normalizeAuditUrl(
  input: string,
): Promise<NormalizedAuditUrl | { error: string }> {
  const origin = await resolveSiteOrigin("public");
  const allowed = await getAllowedAuditHosts();
  return normalizeAuditUrlWithOrigin(input, origin, allowed);
}
