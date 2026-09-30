import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import type { SchemaDiagnostic } from "./deep-merge";

function nodeId(node: SchemaNode): string | undefined {
  const id = node["@id"];
  return typeof id === "string" ? id : undefined;
}

function nodePrimaryType(node: SchemaNode): string | undefined {
  const type = node["@type"];
  if (typeof type === "string") return type;
  if (Array.isArray(type) && typeof type[0] === "string") return type[0];
  return undefined;
}

function findNodeByType(nodes: SchemaNode[], type: string): SchemaNode | undefined {
  return nodes.find((node) => {
    const primary = nodePrimaryType(node);
    if (primary === type) return true;
    const multi = node["@type"];
    return Array.isArray(multi) && multi.includes(type);
  });
}

/** Wire mainEntity / mainEntityOfPage and ensure core refs are consistent. */
export function resolveGraphRelationships(
  nodes: SchemaNode[],
  ctx: SchemaContext,
): { nodes: SchemaNode[]; diagnostics: SchemaDiagnostic[] } {
  const diagnostics: SchemaDiagnostic[] = [];
  const byId = new Map<string, SchemaNode>();
  for (const node of nodes) {
    const id = nodeId(node);
    if (id) byId.set(id, node);
  }

  const webpage = findNodeByType(nodes, "WebPage");
  const product = findNodeByType(nodes, "Product");
  const article = findNodeByType(nodes, "Article");
  const faqPage = findNodeByType(nodes, "FAQPage");

  if (!webpage) return { nodes, diagnostics };

  const webpageId = nodeId(webpage);
  const updatedWebpage = { ...webpage };

  // Primary entity precedence: Product > Article > FAQ
  if (product && ctx.page.pageType === "product") {
    const productId = nodeId(product);
    if (productId) {
      updatedWebpage.mainEntity = entityRef(`product-${ctx.page.product?.id ?? "page"}`, ctx);
      const updatedProduct = {
        ...product,
        mainEntityOfPage: entityRef("webpage", ctx),
      };
      const idx = nodes.findIndex((n) => nodeId(n) === productId);
      if (idx >= 0) {
        const next = [...nodes];
        next[idx] = updatedProduct;
        const wpIdx = nodes.findIndex((n) => nodeId(n) === webpageId);
        if (wpIdx >= 0) next[wpIdx] = updatedWebpage;
        return { nodes: next, diagnostics };
      }
    }
  }

  if (article && ctx.page.pageType === "blog") {
    const articleId = nodeId(article);
    if (articleId) {
      updatedWebpage.mainEntity = entityRef("article", ctx);
      const updatedArticle = {
        ...article,
        mainEntityOfPage: entityRef("webpage", ctx),
      };
      const next = [...nodes];
      const artIdx = nodes.findIndex((n) => nodeId(n) === articleId);
      const wpIdx = nodes.findIndex((n) => nodeId(n) === webpageId);
      if (artIdx >= 0) next[artIdx] = updatedArticle;
      if (wpIdx >= 0) next[wpIdx] = updatedWebpage;
      return { nodes: next, diagnostics };
    }
  }

  if (faqPage && ctx.page.faqItems.length > 0 && !product && !article) {
    updatedWebpage.mainEntity = entityRef("faqpage", ctx);
    const wpIdx = nodes.findIndex((n) => nodeId(n) === webpageId);
    if (wpIdx >= 0) {
      const next = [...nodes];
      next[wpIdx] = updatedWebpage;
      return { nodes: next, diagnostics };
    }
  }

  return { nodes, diagnostics };
}

function typesConflict(a: SchemaNode, b: SchemaNode): boolean {
  const typeA = a["@type"];
  const typeB = b["@type"];
  if (typeA === undefined || typeB === undefined) return false;
  if (typeof typeA === "string" && typeof typeB === "string") return typeA !== typeB;
  return JSON.stringify(typeA) !== JSON.stringify(typeB);
}

/** Dedupe by @id; quarantine conflicting @type on duplicate @id. */
export function dedupeById(nodes: SchemaNode[]): {
  nodes: SchemaNode[];
  quarantinedNodes: SchemaNode[];
  diagnostics: SchemaDiagnostic[];
} {
  const byId = new Map<string, SchemaNode>();
  const withoutId: SchemaNode[] = [];
  const quarantinedNodes: SchemaNode[] = [];
  const diagnostics: SchemaDiagnostic[] = [];

  for (const node of nodes) {
    const id = nodeId(node);
    if (!id) {
      withoutId.push(node);
      continue;
    }

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, node);
      continue;
    }

    if (typesConflict(existing, node)) {
      quarantinedNodes.push(node);
      diagnostics.push({
        severity: "error",
        code: "DUPLICATE_ID_TYPE_CONFLICT",
        message: `Duplicate @id "${id}" with conflicting @type.`,
        nodeId: id,
      });
      continue;
    }

    // Same @id, compatible type — keep first (should already be merged)
    diagnostics.push({
      severity: "warning",
      code: "DUPLICATE_ID_MERGED",
      message: `Duplicate @id "${id}" merged.`,
      nodeId: id,
    });
  }

  return { nodes: [...byId.values(), ...withoutId], quarantinedNodes, diagnostics };
}
