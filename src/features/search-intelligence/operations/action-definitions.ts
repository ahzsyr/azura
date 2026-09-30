import type { OperationCategory, OperationDefinition, RiskLevel } from "./types";

export const OPERATION_DEFINITIONS: OperationDefinition[] = [
  // Safe
  {
    id: "schema.rebuild",
    label: "Rebuild Schema",
    category: "schema",
    risk: "safe",
    description: "Regenerate JSON-LD from the entity graph.",
  },
  {
    id: "schema.validate",
    label: "Validate Schema",
    category: "schema",
    risk: "safe",
    description: "Run semantic schema validation.",
  },
  {
    id: "google.request_indexing",
    label: "Request Indexing",
    category: "google",
    risk: "safe",
    description: "Submit URL to Indexing API / Search Console.",
  },
  {
    id: "google.run_pagespeed",
    label: "Run PageSpeed",
    category: "performance",
    risk: "safe",
    description: "Run PageSpeed Insights analysis.",
  },
  {
    id: "sitemap.rebuild",
    label: "Rebuild Sitemap",
    category: "system",
    risk: "safe",
    description: "Rebuild and prepare sitemap submission.",
  },
  {
    id: "ai.generate_alt",
    label: "Generate Alt Text",
    category: "ai",
    risk: "safe",
    description: "Generate missing image alt text.",
  },
  {
    id: "page.inspect_url",
    label: "Inspect URL",
    category: "page",
    risk: "safe",
    description: "Inspect indexing and rich-result status.",
  },
  {
    id: "seo.submit_priority_pages",
    label: "Submit Priority Pages",
    category: "google",
    risk: "safe",
    description: "Repair main-page robots metadata and submit priority URLs to IndexNow.",
  },
  {
    id: "page.serp_preview",
    label: "SERP Preview",
    category: "page",
    risk: "safe",
    description: "Preview desktop/mobile SERP snippet.",
  },
  {
    id: "impact.simulate",
    label: "Simulate Impact",
    category: "system",
    risk: "safe",
    description: "Simulate SEO impact before publish.",
  },

  // Moderate
  {
    id: "ai.apply_metadata",
    label: "Apply AI Metadata",
    category: "ai",
    risk: "moderate",
    description: "Apply AI-suggested title/description changes.",
  },
  {
    id: "linking.apply",
    label: "Apply Internal Links",
    category: "linking",
    risk: "moderate",
    description: "Apply selected internal link recommendations.",
  },
  {
    id: "google.sync_business_profile",
    label: "Sync Google Business",
    category: "google",
    risk: "moderate",
    description: "Sync NAP and hours from Business Profile.",
  },
  {
    id: "content.create_draft",
    label: "Create CMS Draft",
    category: "content",
    risk: "moderate",
    description: "Create a CMS draft from a topic gap.",
  },
  {
    id: "entity.edit",
    label: "Edit Entity",
    category: "entity",
    risk: "moderate",
    description: "Update entity properties with confidence metadata.",
    createsRollbackCheckpoint: true,
  },
  {
    id: "entity.validate",
    label: "Validate Entity",
    category: "entity",
    risk: "safe",
    description: "Validate entity completeness for Knowledge readiness.",
  },
  {
    id: "entity.sync",
    label: "Sync Entity Sources",
    category: "entity",
    risk: "moderate",
    description: "Sync entity from configured sources.",
  },
  {
    id: "schema.compare",
    label: "Compare Schema Versions",
    category: "schema",
    risk: "safe",
    description: "Compare schema versions before publish.",
  },

  // High
  {
    id: "entity.merge",
    label: "Merge Entities",
    category: "entity",
    risk: "high",
    description: "Merge duplicate entities into a canonical record.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "schema.publish",
    label: "Publish Schema",
    category: "schema",
    risk: "high",
    description: "Promote schema version to production.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "page.replace_canonical",
    label: "Replace Canonical",
    category: "page",
    risk: "high",
    description: "Replace canonical URL for a page.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "system.rollback_production",
    label: "Rollback Production Revision",
    category: "system",
    risk: "high",
    description: "Rollback a production SEO revision.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "promotion.promote",
    label: "Promote Environment",
    category: "system",
    risk: "high",
    description: "Promote SEO changes across environments.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },

  // Critical
  {
    id: "entity.delete",
    label: "Delete Entity",
    category: "entity",
    risk: "critical",
    description: "Delete a graph entity node.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "entity.delete_organization",
    label: "Remove Organization Entity",
    category: "entity",
    risk: "critical",
    description: "Remove Organization from the entity graph.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "system.bulk_redirects",
    label: "Bulk Redirects",
    category: "system",
    risk: "critical",
    description: "Apply bulk redirect rules.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
  {
    id: "page.delete_indexed",
    label: "Delete Indexed Page",
    category: "page",
    risk: "critical",
    description: "Retire or remove an indexed page URL.",
    requiresConfirmation: true,
    createsRollbackCheckpoint: true,
  },
];

export function getOperationDefinition(id: string): OperationDefinition | null {
  return OPERATION_DEFINITIONS.find((d) => d.id === id) ?? null;
}

export function listOperationsByCategory(category: OperationCategory): OperationDefinition[] {
  return OPERATION_DEFINITIONS.filter((d) => d.category === category);
}

export function listOperationsByRisk(risk: RiskLevel): OperationDefinition[] {
  return OPERATION_DEFINITIONS.filter((d) => d.risk === risk);
}
