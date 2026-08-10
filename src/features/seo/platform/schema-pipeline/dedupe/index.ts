import type { SeoStructuredConfig } from "@/features/seo/types";
import type { SchemaNode } from "../types";

function nodeType(node: SchemaNode): string {
  const type = node["@type"];
  if (typeof type === "string") return type;
  if (Array.isArray(type) && typeof type[0] === "string") return type[0];
  return "";
}

function nodeId(node: SchemaNode): string | undefined {
  const id = node["@id"];
  return typeof id === "string" ? id : undefined;
}

function firstWinsByType(type: string, nodes: SchemaNode[]): SchemaNode[] {
  let seen = false;
  return nodes.filter((node) => {
    if (nodeType(node) !== type) return true;
    if (seen) return false;
    seen = true;
    return true;
  });
}

function firstWinsById(nodes: SchemaNode[]): SchemaNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const id = nodeId(node);
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeQuestion(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export const organizationDedupeRule = {
  id: "organization",
  apply(nodes: SchemaNode[]): SchemaNode[] {
    return firstWinsByType("Organization", nodes);
  },
};

export const websiteDedupeRule = {
  id: "website",
  apply(nodes: SchemaNode[]): SchemaNode[] {
    return firstWinsByType("WebSite", nodes);
  },
};

export const breadcrumbDedupeRule = {
  id: "breadcrumb",
  apply(nodes: SchemaNode[]): SchemaNode[] {
    return firstWinsByType("BreadcrumbList", nodes);
  },
};

export const imageDedupeRule = {
  id: "image",
  apply(nodes: SchemaNode[]): SchemaNode[] {
    const seenImageIds = new Set<string>();
    return nodes.filter((node) => {
      if (nodeType(node) !== "ImageObject") return true;
      const id = nodeId(node);
      if (!id) return true;
      if ( seenImageIds.has(id)) return false;
      seenImageIds.add(id);
      return true;
    });
  },
};

export const faqDedupeRule = {
  id: "faq",
  apply(nodes: SchemaNode[]): SchemaNode[] {
    const faqPages = nodes.filter((node) => nodeType(node) === "FAQPage");
    if (faqPages.length <= 1) return nodes;

    const nonFaq = nodes.filter((node) => nodeType(node) !== "FAQPage");
    const questions = new Map<string, Record<string, unknown>>();

    for (const faqPage of faqPages) {
      const mainEntity = faqPage.mainEntity;
      if (!Array.isArray(mainEntity)) continue;
      for (const item of mainEntity) {
        if (typeof item !== "object" || item === null) continue;
        const question = item as Record<string, unknown>;
        const name = typeof question.name === "string" ? question.name : "";
        if (!name.trim()) continue;
        const key = normalizeQuestion(name);
        if (!questions.has(key)) questions.set(key, question);
      }
    }

    const mergedFaq: SchemaNode = {
      ...faqPages[0],
      mainEntity: [...questions.values()],
    };

    return [...nonFaq, mergedFaq];
  },
};

export const manualOverrideDedupeRule = {
  id: "manual-override",
  apply(nodes: SchemaNode[]): SchemaNode[] {
    return firstWinsById(nodes);
  },
};

export function applyManualOverrides(
  nodes: SchemaNode[],
  config: SeoStructuredConfig,
): SchemaNode[] {
  const overrides: SchemaNode[] = [];
  if (config.organization) overrides.push(config.organization as SchemaNode);
  if (config.website) overrides.push(config.website as SchemaNode);
  if (!overrides.length) return nodes;
  return [...nodes, ...overrides];
}

export const defaultDedupeRules = [
  organizationDedupeRule,
  websiteDedupeRule,
  breadcrumbDedupeRule,
  imageDedupeRule,
  faqDedupeRule,
  manualOverrideDedupeRule,
];

export function dedupe(nodes: SchemaNode[]): SchemaNode[] {
  return defaultDedupeRules.reduce((acc, rule) => rule.apply(acc), nodes);
}
