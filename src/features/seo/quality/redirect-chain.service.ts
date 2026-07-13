import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoQualityIssue } from "./types";

export const redirectChainService = {
  async analyze(): Promise<SeoQualityIssue[]> {
    const redirects = await seoRepository.listRedirects(false);
    const active = redirects.filter((redirect) => redirect.isActive);
    const graph = new Map(active.map((redirect) => [redirect.fromPath, redirect.toPath]));
    const issues: SeoQualityIssue[] = [];

    for (const redirect of active) {
      const seen = new Set<string>([redirect.fromPath]);
      let current = redirect.toPath;
      const chain = [redirect.fromPath, redirect.toPath];

      while (graph.has(current)) {
        if (seen.has(current)) {
          issues.push({
            id: `redirect-loop-${redirect.id}`,
            title: "Redirect loop detected",
            severity: "critical",
            message: chain.join(" -> "),
            href: "/admin/seo/redirects",
          });
          break;
        }
        seen.add(current);
        current = graph.get(current)!;
        chain.push(current);
      }

      if (chain.length > 2) {
        issues.push({
          id: `redirect-chain-${redirect.id}`,
          title: "Redirect chain detected",
          severity: "warn",
          message: chain.join(" -> "),
          href: "/admin/seo/redirects",
        });
      }
    }

    return issues;
  },
};
