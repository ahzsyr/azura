import "server-only";

import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { listPageSeoContexts } from "@/features/seo/resolve-page-seo-context";
import {
  SEO_DESCRIPTION_LENGTH,
  SEO_TITLE_LENGTH,
} from "@/features/seo/scoring/seo-scoring.service";
import type { SeoMetadataAttentionItem } from "./types";

function titleOf(saved: Record<string, string> | undefined): string {
  return (saved?.metaTitleEn ?? saved?.metaTitle ?? "").trim();
}

function descriptionOf(saved: Record<string, string> | undefined): string {
  return (saved?.metaDescriptionEn ?? saved?.metaDescription ?? "").trim();
}

export async function listMetadataAttention(): Promise<SeoMetadataAttentionItem[]> {
  const keys = STATIC_SEO_PAGES.map((page) => page.pageKey);
  let contexts: Awaited<ReturnType<typeof listPageSeoContexts>> = {};
  try {
    contexts = await listPageSeoContexts(keys);
  } catch {
    return [];
  }

  const items: SeoMetadataAttentionItem[] = [];
  for (const page of STATIC_SEO_PAGES) {
    const saved = contexts[page.pageKey]?.savedTranslations;
    const title = titleOf(saved);
    const description = descriptionOf(saved);
    const path = page.path === "" ? "/" : page.path;

    if (!title) {
      items.push({
        pageKey: page.pageKey,
        label: page.label,
        path,
        kind: "missing-title",
        detail: "Missing title",
      });
    } else if (title.length > SEO_TITLE_LENGTH.max) {
      items.push({
        pageKey: page.pageKey,
        label: page.label,
        path,
        kind: "title-too-long",
        detail: `Title too long (${title.length} characters)`,
      });
    }

    if (!description) {
      items.push({
        pageKey: page.pageKey,
        label: page.label,
        path,
        kind: "missing-description",
        detail: "Missing description",
      });
    } else if (description.length > SEO_DESCRIPTION_LENGTH.max) {
      items.push({
        pageKey: page.pageKey,
        label: page.label,
        path,
        kind: "description-too-long",
        detail: `Description too long (${description.length} characters)`,
      });
    }
  }

  return items;
}
