import "server-only";

import type { SchemaGraph, SchemaNode } from "@/features/seo/platform/schema-pipeline/types";
import {
  extractJsonLdFromHtml,
  indexNodesById,
  indexNodesByType,
  nodePrimaryType,
} from "./extract-jsonld-from-html";
import { normalizeAuditUrl } from "./public-schema-audit-core";
import { PUBLIC_SCHEMA_AUDIT_ROUTES } from "./public-schema-audit-routes";
import type { PublicHtmlAuditResult, SchemaNodeDiff } from "./schema-graph-audit.types";

export { PUBLIC_SCHEMA_AUDIT_ROUTES, normalizeAuditUrl };

export type { PublicHtmlAuditResult, SchemaNodeDiff } from "./schema-graph-audit.types";

function countProperties(node: SchemaNode | undefined): number {
  if (!node) return 0;
  return Object.keys(node).filter((k) => !k.startsWith("@") || k === "@type" || k === "@id").length;
}

function countMatchingProperties(a: SchemaNode | undefined, b: SchemaNode | undefined): number {
  if (!a || !b) return 0;
  let matches = 0;
  for (const key of Object.keys(a)) {
    if (key.startsWith("@") && key !== "@type" && key !== "@id") continue;
    if (JSON.stringify(a[key]) === JSON.stringify(b[key])) matches += 1;
  }
  return matches;
}

function extractCanonicalFromHtml(html: string): string | null {
  const match = html.match(
    /<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i,
  );
  return match?.[1]?.trim() ?? null;
}

export function diffSchemaGraphs(
  generated: SchemaGraph,
  publishedNodes: SchemaNode[],
): SchemaNodeDiff[] {
  const generatedByType = indexNodesByType(generated["@graph"]);
  const publishedByType = indexNodesByType(publishedNodes);
  const types = new Set([...generatedByType.keys(), ...publishedByType.keys()]);

  const diffs: SchemaNodeDiff[] = [];
  for (const schemaType of types) {
    const genNode = generatedByType.get(schemaType)?.[0];
    const pubNode = publishedByType.get(schemaType)?.[0];
    const propertyTotal = Math.max(countProperties(genNode), countProperties(pubNode));
    diffs.push({
      schemaType,
      generated: Boolean(genNode),
      published: Boolean(pubNode),
      idMatch:
        genNode && pubNode
          ? genNode["@id"] === pubNode["@id"]
          : genNode || pubNode
            ? false
            : null,
      propertyMatchCount: countMatchingProperties(genNode, pubNode),
      propertyTotal,
    });
  }
  return diffs.sort((a, b) => a.schemaType.localeCompare(b.schemaType));
}

export function countDuplicateIds(nodes: SchemaNode[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const node of nodes) {
    const id = node["@id"];
    if (typeof id !== "string") continue;
    if (seen.has(id)) duplicates += 1;
    else seen.add(id);
  }
  return duplicates;
}

export async function fetchPublicHtml(url: string): Promise<{ html: string } | { error: string }> {
  const normalized = await normalizeAuditUrl(url);
  if ("error" in normalized) return { error: normalized.error };

  try {
    const response = await fetch(normalized.url, {
      headers: { Accept: "text/html", "User-Agent": "BRT-SEO-Audit/1.0" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) {
      return { error: `HTTP ${response.status} for ${normalized.url}` };
    }
    const html = await response.text();
    return { html };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Fetch failed.",
    };
  }
}

export async function auditPublicHtml(input: {
  urlOrPath: string;
  generatedGraph: SchemaGraph;
  seoMetaJsonLdInDatabase?: boolean;
  canonicalExpected?: string | null;
}): Promise<PublicHtmlAuditResult> {
  const normalized = await normalizeAuditUrl(input.urlOrPath);
  if ("error" in normalized) {
    return {
      url: input.urlOrPath,
      pathname: input.urlOrPath,
      fetched: false,
      fetchError: normalized.error,
      renderedInHtml: false,
      invalidJsonLdBlocks: 0,
      duplicateIdGenerated: countDuplicateIds(input.generatedGraph["@graph"]),
      duplicateIdPublished: 0,
      canonicalMatch: null,
      nodeDiffs: diffSchemaGraphs(input.generatedGraph, []),
      seoMetaJsonLd: {
        inDatabase: Boolean(input.seoMetaJsonLdInDatabase),
        inResolvedGraph: Boolean(input.seoMetaJsonLdInDatabase),
        inPublishedHtml: false,
      },
      generatedGraph: input.generatedGraph,
      publishedNodes: [],
    };
  }

  const fetchResult = await fetchPublicHtml(normalized.url);
  if ("error" in fetchResult) {
    return {
      url: normalized.url,
      pathname: normalized.pathname,
      fetched: false,
      fetchError: fetchResult.error,
      renderedInHtml: false,
      invalidJsonLdBlocks: 0,
      duplicateIdGenerated: countDuplicateIds(input.generatedGraph["@graph"]),
      duplicateIdPublished: 0,
      canonicalExpected: input.canonicalExpected ?? null,
      canonicalMatch: null,
      nodeDiffs: diffSchemaGraphs(input.generatedGraph, []),
      seoMetaJsonLd: {
        inDatabase: Boolean(input.seoMetaJsonLdInDatabase),
        inResolvedGraph: Boolean(input.seoMetaJsonLdInDatabase),
        inPublishedHtml: false,
      },
      generatedGraph: input.generatedGraph,
      publishedNodes: [],
    };
  }

  const { nodes: publishedNodes, invalidBlocks } = extractJsonLdFromHtml(fetchResult.html);
  const canonicalPublished = extractCanonicalFromHtml(fetchResult.html);
  const canonicalExpected = input.canonicalExpected ?? null;
  const canonicalMatch =
    canonicalExpected && canonicalPublished
      ? canonicalExpected.replace(/\/$/, "") === canonicalPublished.replace(/\/$/, "")
      : canonicalExpected || canonicalPublished
        ? false
        : null;

  const publishedById = indexNodesById(publishedNodes);
  const hasManualInPublished =
    input.seoMetaJsonLdInDatabase &&
    publishedNodes.some((node) => {
      const genIds = new Set(
        input.generatedGraph["@graph"]
          .map((n) => n["@id"])
          .filter((id): id is string => typeof id === "string"),
      );
      const id = node["@id"];
      return typeof id === "string" && !genIds.has(id);
    });

  return {
    url: normalized.url,
    pathname: normalized.pathname,
    fetched: true,
    renderedInHtml: publishedNodes.length > 0,
    invalidJsonLdBlocks: invalidBlocks,
    duplicateIdGenerated: countDuplicateIds(input.generatedGraph["@graph"]),
    duplicateIdPublished: countDuplicateIds(publishedNodes),
    canonicalExpected,
    canonicalPublished,
    canonicalMatch,
    nodeDiffs: diffSchemaGraphs(input.generatedGraph, publishedNodes),
    seoMetaJsonLd: {
      inDatabase: Boolean(input.seoMetaJsonLdInDatabase),
      inResolvedGraph: Boolean(input.seoMetaJsonLdInDatabase),
      inPublishedHtml: hasManualInPublished || Boolean(publishedById.size),
    },
    generatedGraph: input.generatedGraph,
    publishedNodes,
  };
}
