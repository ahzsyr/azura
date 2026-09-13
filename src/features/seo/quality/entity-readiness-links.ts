export type EntityReadinessUpdateLink = {
  href: string;
  label: string;
};

/** Admin destinations for fixing missing entity-readiness audit fields. */
export const ENTITY_READINESS_UPDATE_LINKS: Record<string, EntityReadinessUpdateLink> = {
  "Organization name": { href: "/admin/company", label: "Company" },
  "Legal name": { href: "/admin/company?tab=schema", label: "Schema entity" },
  "Canonical URL": { href: "/admin/seo/metadata", label: "SEO metadata" },
  Logo: { href: "/admin/theme", label: "Theme / logo" },
  Description: { href: "/admin/company?tab=schema", label: "Schema entity" },
  "Business type": { href: "/admin/seo/structured-data?tab=settings", label: "Pipeline settings" },
  Address: { href: "/admin/company?tab=localization", label: "Company address" },
  Telephone: { href: "/admin/company?tab=contact", label: "Company contact" },
  Email: { href: "/admin/company?tab=contact", label: "Company contact" },
  "Geo coordinates": { href: "/admin/company?tab=schema", label: "Schema entity" },
  "Area served": { href: "/admin/company?tab=schema", label: "Schema entity" },
  "sameAs social URLs": { href: "/admin/company?tab=contact", label: "Company profile" },
};

export function entityReadinessUpdateLink(label: string): EntityReadinessUpdateLink | undefined {
  return ENTITY_READINESS_UPDATE_LINKS[label];
}
