import type { ResolvedSeoDocument } from "./seo-document";
import { isNoIndexRobots } from "./seo-robots";

export function isIndexableSeoDocument(doc: ResolvedSeoDocument): boolean {
  if (doc.status !== 200) return false;
  if (isNoIndexRobots(doc.robots)) return false;
  if (doc.identity.pageType === "search") return false;
  if (doc.identity.pageKey === "compare") return false;
  if (doc.identity.publicPath.startsWith("/compare")) return false;

  if (doc.canonical && doc.url) {
    try {
      const canonical = new URL(doc.canonical);
      const self = new URL(doc.url);
      if (canonical.origin !== self.origin || canonical.pathname !== self.pathname) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return doc.indexable;
}
